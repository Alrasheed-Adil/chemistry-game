/**
 * Chemistry — game server entry point.
 *
 * - Socket.io handles all real-time game traffic (see sockets.js).
 * - In production (`npm run build && npm start`) this server also serves the
 *   built client from ../../client/dist, so the whole game runs on one port.
 */

import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { registerSockets } from './sockets.js';

// `--port=NNNN` (used by `npm run dev`) wins over $PORT so a stray PORT env var
// can't collide with the Vite dev server; in production $PORT is honoured.
const portArg = process.argv.find((a) => a.startsWith('--port='))?.split('=')[1];
const PORT = Number(portArg) || Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true }, // dev: Vite proxies, but allow direct connections too
});

registerSockets(io);

app.get('/health', (_req, res) => res.json({ ok: true }));

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback — any non-API GET returns index.html
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`⚗️  Chemistry server listening on http://localhost:${PORT}`);
  if (!fs.existsSync(clientDist)) console.log('   (client not built — run the Vite dev server for the UI)');
});
