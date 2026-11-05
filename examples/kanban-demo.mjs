import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
const dir = await mkdtemp(join(tmpdir(), 'kanban-demo-'));
const server = createApp({ dataFile: join(dir, 'data.json') }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const request = (path, method = 'GET', body) => fetch(base + path, { method, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const add = async (path, data) => { const r = await request(path, 'POST', data); assert.equal(r.status, 201); return r.json(); };
try {
  const board = await add('/boards', { name: 'Aula de APIs' });
  const todo = await add(`/boards/${board.id}/columns`, { name: 'A fazer' }), done = await add(`/boards/${board.id}/columns`, { name: 'Concluído' });
  const first = await add(`/columns/${todo.id}/cards`, { title: 'Documentar rotas' }); await add(`/columns/${todo.id}/cards`, { title: 'Escrever testes' });
  const moved = await request(`/cards/${first.id}/move`, 'POST', { column_id: done.id, position: 1 }); assert.equal(moved.status, 200);
  const snapshot = await (await request(`/boards/${board.id}`)).json();
  const display = snapshot.columns.map(c => ({ name: c.name, cards: c.cards.map(k => ({ title: k.title, position: k.position })) }));
  assert.deepEqual(display, [{ name: 'A fazer', cards: [{ title: 'Escrever testes', position: 1 }] }, { name: 'Concluído', cards: [{ title: 'Documentar rotas', position: 1 }] }]);
  console.log(JSON.stringify(display, null, 2));
  const blocked = await request(`/columns/${done.id}`, 'DELETE'); assert.equal(blocked.status, 409); console.log('Excluir coluna ocupada:', blocked.status, await blocked.text());
} finally { await new Promise(r => server.close(r)); await rm(dir, { recursive: true, force: true }); }
