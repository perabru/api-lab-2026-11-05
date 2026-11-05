import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
class ApiError extends Error { constructor(status, code, message) { super(message); Object.assign(this, { status, code }); } }
const fail = (status, code, message) => { throw new ApiError(status, code, message); };
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function keys(v, allowed) { if (!object(v) || !Object.keys(v).length || Object.keys(v).some(k => !allowed.includes(k))) fail(422, 'validation_error', 'Objeto vazio ou campos desconhecidos.'); }
function text(v, field, max, empty = false) { if (typeof v !== 'string' || v.length > max || /[\u0000-\u001f\u007f]/.test(v) || (!empty && !v.trim())) fail(422, 'validation_error', `${field}: texto inválido, máximo ${max}.`); return v.trim(); }
function named(v) { keys(v, ['name']); return { name: text(v.name, 'name', 80) }; }
function cardFields(v, patch = false) {
  keys(v, ['title', 'description']); const data = {};
  if (!patch || 'title' in v) data.title = text(v.title, 'title', 140);
  if (!patch || 'description' in v) data.description = text(v.description === undefined ? '' : v.description, 'description', 2000, true);
  return data;
}
async function body(req) {
  if (req.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') fail(415, 'unsupported_media_type', 'Use application/json.');
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > 16384) { req.resume(); fail(413, 'payload_too_large', 'Limite: 16 KiB.'); } chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'invalid_json', 'JSON inválido.'); }
}
function validateState(s) {
  if (!object(s) || s.version !== 1 || !['boards', 'columns', 'cards'].every(k => Array.isArray(s[k])) || s.boards.length > 100 || s.columns.length > 1000 || s.cards.length > 5000) throw new Error('Arquivo inválido.');
  const ids = new Set();
  for (const r of [...s.boards, ...s.columns, ...s.cards]) { if (!r || typeof r.id !== 'string' || !/^[0-9a-f-]{36}$/.test(r.id) || ids.has(r.id)) throw new Error('Identificador inválido ou repetido.'); ids.add(r.id); }
  for (const b of s.boards) named({ name: b.name });
  const membership = [];
  for (const c of s.columns) {
    named({ name: c.name });
    if (!s.boards.some(b => b.id === c.board_id) || !Array.isArray(c.card_ids)) throw new Error('Coluna órfã ou inválida.');
    for (const id of c.card_ids) { if (!s.cards.some(k => k.id === id && k.column_id === c.id)) throw new Error('Vínculo de cartão inválido.'); membership.push(id); }
  }
  if (membership.length !== s.cards.length || new Set(membership).size !== membership.length) throw new Error('Cartão órfão ou duplicado.');
  for (const c of s.cards) cardFields({ title: c.title, description: c.description });
}
export function createApp({ dataFile }) {
  let state = { version: 1, boards: [], columns: [], cards: [] };
  if (existsSync(dataFile)) { state = JSON.parse(readFileSync(dataFile, 'utf8')); validateState(state); }
  function save(next) {
    const tmp = dataFile + '.tmp';
    try { mkdirSync(dirname(dataFile), { recursive: true }); writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 }); renameSync(tmp, dataFile); state = next; }
    catch { try { rmSync(tmp, { force: true }); } catch { /* preserve original state */ } fail(503, 'storage_unavailable', 'Alteração não aplicada: falha de persistência.'); }
  }
  const find = (kind, id) => { const r = state[kind].find(r => r.id === id); if (!r) fail(404, 'not_found', 'Recurso não encontrado.'); return r; };
  const cardView = card => ({ ...card, position: find('columns', card.column_id).card_ids.indexOf(card.id) + 1 });
  const boardView = board => ({ ...board, columns: state.columns.filter(c => c.board_id === board.id).map(c => ({ id: c.id, board_id: c.board_id, name: c.name, cards: c.card_ids.map(id => cardView(find('cards', id))) })) });
  return createServer(async (req, res) => {
    const send = (status, value, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(value === undefined ? undefined : JSON.stringify(value)); };
    try {
      const u = new URL(req.url, 'http://localhost');
      if (u.search) fail(400, 'invalid_query', 'Esta API não aceita parâmetros de consulta.');
      if (u.pathname === '/health' && req.method === 'GET') return send(200, { status: 'ok' });
      const routes = [
        [/^\/boards$/, ['GET', 'POST'], 'boards'],
        [/^\/boards\/([0-9a-f-]{36})$/, ['GET', 'DELETE'], 'board'],
        [/^\/boards\/([0-9a-f-]{36})\/columns$/, ['POST'], 'columns'],
        [/^\/columns\/([0-9a-f-]{36})$/, ['DELETE'], 'column'],
        [/^\/columns\/([0-9a-f-]{36})\/cards$/, ['POST'], 'cards'],
        [/^\/cards\/([0-9a-f-]{36})$/, ['GET', 'PATCH', 'DELETE'], 'card'],
        [/^\/cards\/([0-9a-f-]{36})\/move$/, ['POST'], 'move']
      ];
      let route, match;
      for (const r of routes) { const m = u.pathname.match(r[0]); if (m) { route = r; match = m; break; } }
      if (!route) fail(404, 'not_found', 'Rota não encontrada.');
      if (!route[1].includes(req.method)) { res.setHeader('Allow', route[1].join(', ')); fail(405, 'method_not_allowed', 'Método não permitido.'); }
      const data = ['POST', 'PATCH'].includes(req.method) ? await body(req) : undefined;
      // All state reads/mutations after body parsing are synchronous in this process.
      const kind = route[2], id = match[1];
      if (kind === 'boards' && req.method === 'GET') return send(200, { items: state.boards.map(b => ({ ...b })), total: state.boards.length });
      if (kind === 'board' && req.method === 'GET') return send(200, boardView(find('boards', id)));
      if (kind === 'card' && req.method === 'GET') return send(200, cardView(find('cards', id)));
      const next = structuredClone(state);
      if (kind === 'boards') {
        const values = named(data); if (state.boards.length >= 100) fail(409, 'capacity_reached', 'Limite de 100 quadros.');
        const b = { id: randomUUID(), ...values }; next.boards.push(b); save(next); return send(201, b, { Location: `/boards/${b.id}` });
      }
      if (kind === 'columns') {
        find('boards', id); const values = named(data); if (state.columns.length >= 1000) fail(409, 'capacity_reached', 'Limite de 1000 colunas.');
        const c = { id: randomUUID(), board_id: id, ...values, card_ids: [] }; next.columns.push(c); save(next); return send(201, { id: c.id, board_id: id, name: c.name, cards: [] });
      }
      if (kind === 'cards') {
        find('columns', id); const values = cardFields(data); if (state.cards.length >= 5000) fail(409, 'capacity_reached', 'Limite de 5000 cartões.');
        const c = { id: randomUUID(), column_id: id, ...values }; next.cards.push(c); next.columns.find(c => c.id === id).card_ids.push(c.id); save(next); return send(201, cardView(c), { Location: `/cards/${c.id}` });
      }
      if (kind === 'move') {
        const c = find('cards', id); keys(data, ['column_id', 'position']);
        if (typeof data.column_id !== 'string') fail(422, 'validation_error', 'column_id obrigatório.');
        const source = find('columns', c.column_id), target = find('columns', data.column_id);
        if (source.board_id !== target.board_id) fail(409, 'cross_board_move', 'Mover entre quadros não é permitido.');
        const targetIds = next.columns.find(x => x.id === target.id).card_ids;
        const sourceIds = next.columns.find(x => x.id === source.id).card_ids;
        sourceIds.splice(sourceIds.indexOf(id), 1);
        const position = data.position === undefined ? targetIds.length + 1 : data.position;
        if (!Number.isSafeInteger(position) || position < 1 || position > targetIds.length + 1) fail(422, 'invalid_position', 'position fora da lista final.');
        targetIds.splice(position - 1, 0, id); next.cards.find(x => x.id === id).column_id = target.id;
        save(next); return send(200, cardView(find('cards', id)));
      }
      if (kind === 'card' && req.method === 'PATCH') {
        find('cards', id); const values = cardFields(data, true); Object.assign(next.cards.find(c => c.id === id), values); save(next); return send(200, cardView(find('cards', id)));
      }
      if (kind === 'card') { const c = find('cards', id); next.cards = next.cards.filter(c => c.id !== id); const ids = next.columns.find(x => x.id === c.column_id).card_ids; ids.splice(ids.indexOf(id), 1); }
      if (kind === 'column') { const c = find('columns', id); if (c.card_ids.length) fail(409, 'not_empty', 'Remova ou mova os cartões antes de excluir a coluna.'); next.columns = next.columns.filter(c => c.id !== id); }
      if (kind === 'board') { find('boards', id); if (state.columns.some(c => c.board_id === id)) fail(409, 'not_empty', 'Exclua as colunas antes de excluir o quadro.'); next.boards = next.boards.filter(b => b.id !== id); }
      save(next); return send(204);
    } catch (e) { send(e.status || 500, { error: { code: e.status ? e.code : 'internal_error', message: e.status ? e.message : 'Erro interno.' } }); }
  });
}
