import { resolve } from 'node:path';
import { createApp } from './app.js';
const port = process.env.PORT ?? '3000';
if (!/^\d+$/.test(port) || Number(port) > 65535) throw new Error('PORT inválida.');
const server = createApp({ dataFile: resolve(process.env.DATA_FILE || 'data/kanban.json') });
server.listen(Number(port), process.env.HOST || '127.0.0.1', () => console.log(`Board Lane API: http://${server.address().address}:${server.address().port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
