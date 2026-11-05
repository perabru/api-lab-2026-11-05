import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { createApp } from '../src/app.js';
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'board-lane-')), file = join(dir, 'data.json');
  const server = createApp({ dataFile: file }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(r => server.close(r)); await rm(dir, { recursive: true, force: true }); });
  const req = (path, method = 'GET', body) => fetch(base + path, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const add = async (path, data) => { const r = await req(path, 'POST', data); assert.equal(r.status, 201); return r.json(); };
  const board = await add('/boards', { name: 'Aula' }); const a = await add(`/boards/${board.id}/columns`, { name: 'A fazer' }); const b = await add(`/boards/${board.id}/columns`, { name: 'Pronto' });
  return { file, base, req, add, board, a, b, snapshot: async () => (await req(`/boards/${board.id}`)).json(), card: title => add(`/columns/${a.id}/cards`, { title }) };
}
test('cria vínculos e consulta quadro completo; PATCH preserva demais campos', async t => {
  const f = await fixture(t); const c = await f.card('Primeiro'); assert.equal(c.position, 1);
  const edited = await f.req(`/cards/${c.id}`, 'PATCH', { description: 'Estudar' }); assert.equal(edited.status, 200); assert.equal((await edited.json()).title, 'Primeiro');
  const board = await f.snapshot(); assert.equal(board.columns.length, 2); assert.equal(board.columns[0].cards[0].description, 'Estudar');
  assert.equal((await (await f.req('/boards')).json()).total, 1); assert.equal((await f.req('/health')).status, 200);
});
test('movimentação entre colunas mantém cartão único e ordem contígua', async t => {
  const f = await fixture(t); const x = await f.card('X'), y = await f.card('Y');
  const r = await f.req(`/cards/${x.id}/move`, 'POST', { column_id: f.b.id, position: 1 }); assert.equal(r.status, 200); assert.equal((await r.json()).column_id, f.b.id);
  const board = await f.snapshot(); assert.deepEqual(board.columns[0].cards.map(c => [c.id, c.position]), [[y.id, 1]]); assert.deepEqual(board.columns[1].cards.map(c => [c.id, c.position]), [[x.id, 1]]);
});
test('reordena na mesma coluna; posição se refere à lista final', async t => {
  const f = await fixture(t); const x = await f.card('X'), y = await f.card('Y'), z = await f.card('Z');
  await f.req(`/cards/${x.id}/move`, 'POST', { column_id: f.a.id, position: 3 });
  let cards = (await f.snapshot()).columns[0].cards; assert.deepEqual(cards.map(c => c.id), [y.id, z.id, x.id]); assert.deepEqual(cards.map(c => c.position), [1, 2, 3]);
  await f.req(`/cards/${z.id}/move`, 'POST', { column_id: f.a.id });
  cards = (await f.snapshot()).columns[0].cards; assert.deepEqual(cards.map(c => c.id), [y.id, x.id, z.id]);
});
test('bloqueia movimento entre quadros e referências inexistentes', async t => {
  const f = await fixture(t); const c = await f.card('X'), other = await f.add('/boards', { name: 'Outro' }); const col = await f.add(`/boards/${other.id}/columns`, { name: 'A' });
  assert.equal((await f.req(`/cards/${c.id}/move`, 'POST', { column_id: col.id })).status, 409);
  assert.equal((await f.req(`/cards/${c.id}/move`, 'POST', { column_id: 'missing' })).status, 404);
  assert.equal((await f.snapshot()).columns[0].cards.length, 1);
  assert.equal((await f.req('/boards/00000000-0000-4000-8000-000000000000/columns', 'POST', { name: 'Órfã' })).status, 404);
});
test('posições inválidas não alteram nem removem cartões', async t => {
  const f = await fixture(t); const c = await f.card('X'); const before = await f.snapshot();
  for (const position of [0, -1, 2, 1.5, '1', null]) assert.equal((await f.req(`/cards/${c.id}/move`, 'POST', { column_id: f.b.id, position })).status, 422);
  assert.deepEqual(await f.snapshot(), before);
});
test('exclusão protege pais não vazios; remove vínculos sem órfãos', async t => {
  const f = await fixture(t); const c = await f.card('X');
  assert.equal((await f.req(`/columns/${f.a.id}`, 'DELETE')).status, 409); assert.equal((await f.req(`/boards/${f.board.id}`, 'DELETE')).status, 409);
  const deleted = await f.req(`/cards/${c.id}`, 'DELETE'); assert.equal(deleted.status, 204); assert.equal(await deleted.text(), '');
  assert.equal((await f.req(`/cards/${c.id}`)).status, 404);
  for (const col of [f.a, f.b]) assert.equal((await f.req(`/columns/${col.id}`, 'DELETE')).status, 204);
  assert.equal((await f.req(`/boards/${f.board.id}`, 'DELETE')).status, 204); assert.equal((await (await f.req('/boards')).json()).total, 0);
});
test('validação rejeita tipos e campos imutáveis/desconhecidos', async t => {
  const f = await fixture(t); const c = await f.card('X');
  for (const body of [null, [], {}, { name: '' }, { name: 'x', extra: 1 }, { name: 'x'.repeat(81) }]) assert.equal((await f.req('/boards', 'POST', body)).status, 422);
  for (const body of [{ title: '' }, { title: 'x', column_id: f.b.id }, { title: 'x', description: null }, { title: 'x', description: 'x'.repeat(2001) }]) assert.equal((await f.req(`/columns/${f.a.id}/cards`, 'POST', body)).status, 422);
  assert.equal((await f.req(`/cards/${c.id}`, 'PATCH', { column_id: f.b.id })).status, 422);
});
test('JSON, mídia, corpo, query, rota e método têm erros coerentes', async t => {
  const f = await fixture(t);
  const raw = (data, type) => fetch(f.base + '/boards', { method: 'POST', headers: { 'Content-Type': type }, body: data });
  assert.equal((await raw('{', 'application/json')).status, 400); assert.equal((await raw('{}', 'text/plain')).status, 415); assert.equal((await raw('x'.repeat(17000), 'application/json')).status, 413);
  assert.equal((await f.req('/boards?page=1')).status, 400); assert.equal((await f.req('/missing')).status, 404);
  const r = await f.req('/boards', 'PATCH', { name: 'X' }); assert.equal(r.status, 405); assert.equal(r.headers.get('allow'), 'GET, POST'); assert.equal((await r.json()).error.code, 'method_not_allowed');
});
test('criações e movimentos concorrentes não perdem ou duplicam cartões', async t => {
  const f = await fixture(t); const cards = await Promise.all(Array.from({ length: 16 }, (_, i) => f.card('C' + i)));
  const moves = await Promise.all(cards.map(c => f.req(`/cards/${c.id}/move`, 'POST', { column_id: f.b.id, position: 1 }))); assert.ok(moves.every(r => r.status === 200));
  const board = await f.snapshot(); assert.equal(board.columns[0].cards.length, 0); assert.equal(board.columns[1].cards.length, 16); assert.equal(new Set(board.columns[1].cards.map(c => c.id)).size, 16); assert.deepEqual(board.columns[1].cards.map(c => c.position), Array.from({ length: 16 }, (_, i) => i + 1));
});
test('falha de gravação não aplica movimento nem altera arquivo anterior', async t => {
  const f = await fixture(t); const c = await f.card('X'); const before = await readFile(f.file, 'utf8'); await mkdir(f.file + '.tmp');
  assert.equal((await f.req(`/cards/${c.id}/move`, 'POST', { column_id: f.b.id })).status, 503); assert.equal((await f.snapshot()).columns[0].cards.length, 1); assert.equal(await readFile(f.file, 'utf8'), before);
});
test('arquivo inválido ou vínculo órfão impede inicialização sem sobrescrever', async t => {
  const f = await fixture(t); const c = await f.card('X'); const data = JSON.parse(await readFile(f.file, 'utf8')); data.cards[0].column_id = 'missing'; await writeFile(f.file, JSON.stringify(data)); assert.throws(() => createApp({ dataFile: f.file }));
  await writeFile(f.file, '{broken'); assert.throws(() => createApp({ dataFile: f.file })); assert.equal(await readFile(f.file, 'utf8'), '{broken');
});
test('processo real reiniciado preserva quadro, edição e ordem após movimento', { timeout: 15000 }, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-process-')); let child;
  const stop = async () => { if (child && child.exitCode === null) { const done = once(child, 'exit'); child.kill('SIGTERM'); await done; } };
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  const start = async () => { child = spawn(process.execPath, ['src/server.js'], { cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: '0', DATA_FILE: join(dir, 'data.json') }, stdio: ['ignore', 'pipe', 'pipe'] }); return new Promise((resolve, reject) => { let text = ''; child.stdout.on('data', c => { text += c; const m = text.match(/http:\/\/127\.0\.0\.1:\d+/); if (m) resolve(m[0]); }); child.once('error', reject); child.once('exit', () => reject(Error('Falha ao iniciar'))); }); };
  let base = await start(); const req = (path, body, method = 'POST') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const add = async (path, body) => (await req(path, body)).json();
  const b = await add('/boards', { name: 'B' }), a = await add(`/boards/${b.id}/columns`, { name: 'A' }), z = await add(`/boards/${b.id}/columns`, { name: 'Z' }), c = await add(`/columns/${a.id}/cards`, { title: 'X' });
  await req(`/cards/${c.id}`, { title: 'Editado' }, 'PATCH'); await req(`/cards/${c.id}/move`, { column_id: z.id, position: 1 }); const before = await (await fetch(base + `/boards/${b.id}`)).json(); await stop(); base = await start();
  assert.deepEqual(await (await fetch(base + `/boards/${b.id}`)).json(), before); assert.equal(before.columns[1].cards[0].title, 'Editado');
});
