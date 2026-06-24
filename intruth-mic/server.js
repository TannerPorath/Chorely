// InTruth Mic — Express + WebSocket server.
//
// Serves the static PWA and exposes:
//   GET  /api/health        — liveness probe
//   GET  /api/status        — which API keys are configured (booleans only)
//   POST /api/keys          — set/override keys at runtime (in-memory)
//   WS   /ws                — phone streams mic PCM up, gets transcript+verdicts down
//
// All API keys (Deepgram, Anthropic, Serper) live on the server. The phone
// never sees them.

import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getKeyStatus, setKeys } from './lib/config.js';
import { Session } from './lib/session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = process.env.FRONTEND_DIR || path.join(__dirname, 'public');

const app = express();
app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/status', (_req, res) => res.json({ keys: getKeyStatus() }));

app.post('/api/keys', (req, res) => {
  const status = setKeys(req.body || {});
  res.json({ ok: true, keys: status });
});

app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
// SPA-ish fallback so the home-screen app always loads index.html
app.get('*', (_req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  const session = new Session((obj) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
  });

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      session.sendAudio(data);
      return;
    }
    let msg;
    try { msg = JSON.parse(data.toString()); }
    catch { return; }

    switch (msg.type) {
      case 'start':
        session.start({ sampleRate: msg.sampleRate, context: msg.context });
        break;
      case 'stop':
        session.stop();
        break;
      case 'speakerNames':
        session.setSpeakerNames(msg.speakerIdToName);
        break;
    }
  });

  ws.on('close', () => session.stop());
  ws.on('error', () => session.stop());
});

server.listen(PORT, () => {
  console.log(`InTruth Mic listening on http://localhost:${PORT}`);
  const k = getKeyStatus();
  console.log(`Keys configured — Deepgram: ${k.deepgram}, Anthropic: ${k.anthropic}, Serper: ${k.serper}`);
});
