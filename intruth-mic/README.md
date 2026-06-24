# InTruth Mic 🎙

A standalone, installable **iPhone web app** that fact-checks live speech in real
time — using your **phone's microphone** as the source.

It's a microphone-driven port of the
[InTruth](https://github.com/rpanigrahi222/intruth-factcheck) Chrome extension,
which fact-checked the audio of a browser tab/video. Same look and feel, same
pipeline — but instead of capturing a video, it listens to the room through your
iPhone mic, so you can point it at a TV, a debate, a meeting, or a conversation.

> ⚠️ AI verdicts can be wrong or based on outdated information. Treat this as a
> research aid, not a final authority.

---

## How it works

```
iPhone mic ──PCM──▶  WebSocket  ──▶  Server
                                       ├─ Deepgram   → live transcript + speaker diarization
                                       ├─ Claude     → extracts check-worthy claims, assigns verdicts
                                       └─ Serper     → web search to ground verdicts with sources
iPhone screen ◀── transcript / claims / verdict cards ──┘
```

The phone only captures audio and renders results. **All API keys live on the
server** — they're never shipped to the browser, which also sidesteps the
mobile-Safari CORS limits that make a pure static page impossible here.

Each verdict is produced in two passes, exactly like the original: a fast
first-look verdict appears immediately (marked *verifying…*), then a
web-grounded verdict with sources replaces it a moment later.

**Verdicts:** `TRUE` · `SUBSTANTIALLY TRUE` · `FALSE` · `MISLEADING` · `UNVERIFIABLE`

---

## What you need

| Key | Required? | Used for | Get one |
|-----|-----------|----------|---------|
| **Deepgram** | ✅ | Real-time transcription + speaker diarization | https://deepgram.com |
| **Anthropic** | ✅ | Claim extraction + verdicts (`claude-haiku-4-5`) | https://console.anthropic.com |
| **Serper** | optional | Web search to ground verdicts with sources | https://serper.dev |

Without a Serper key the app still works — it just shows the fast verdicts
without web sources.

---

## Run it

### Docker (recommended)

```bash
cd intruth-mic
cp .env.example .env        # fill in your keys
docker compose up -d --build
```

Then open `http://YOUR-HOST-IP:3200`.

### Plain Node

```bash
cd intruth-mic
npm install
DEEPGRAM_API_KEY=... ANTHROPIC_API_KEY=... SERPER_API_KEY=... npm start
# open http://localhost:3000
```

You can also leave the keys unset and enter them in the in-app **Settings ⚙**
panel (stored in server memory).

---

## ⚠️ HTTPS is required on iPhone

iOS Safari only grants microphone access over **HTTPS** (or `http://localhost`).
To use it on your phone, put the app behind TLS — the same way you'd expose any
home service:

- a reverse proxy with a certificate (Caddy, Nginx Proxy Manager, SWAG, Traefik…), or
- a tunnel (Cloudflare Tunnel, Tailscale Funnel, ngrok).

Plain `http://192.168.x.x:3200` will load but the mic button will be blocked by
iOS.

## Add to Home Screen

In Safari, open the HTTPS URL → **Share** → **Add to Home Screen**. It launches
full-screen like a native app (it's a PWA with its own icon and standalone
display).

---

## Using it

1. Tap **⚙ Settings**, paste your keys, and optionally add **Context** (e.g.
   `Debate: Harris vs Trump`) — this helps attribute claims to the right person.
2. Tap **🎙 Start Fact-Checking** and allow microphone access.
3. Watch the transcript stream in, claims get underlined as they're ruled on,
   and verdict cards appear with explanations and sources.
4. When a new speaker is detected you'll be asked who it is — tap their name to
   tag their claims. You can rename speakers from the chips next to "Verdicts".
5. Tap **↓** to export the session as a text file.

---

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `DEEPGRAM_API_KEY` | — | Transcription (required) |
| `ANTHROPIC_API_KEY` | — | Fact-checking (required) |
| `SERPER_API_KEY` | — | Web grounding (optional) |
| `FACTCHECK_MODEL` | `claude-haiku-4-5-20251001` | Claude model for verdicts |
| `PORT` | `3000` | Server port inside the container |

---

## Project structure

```
intruth-mic/
├── server.js              # Express + WebSocket server
├── lib/
│   ├── config.js          # API keys (env + runtime override) and model
│   ├── session.js         # Deepgram relay + rolling-window fact-check pipeline
│   ├── claude.js          # Anthropic calls + EVALUATE_PROMPT
│   ├── serper.js          # Web search + blocked-domain filtering
│   └── lexical.js         # Speech "conviction" lexical analysis
├── public/                # The iPhone web app (static)
│   ├── index.html
│   ├── app.css            # ported InTruth styling, mobile layout
│   ├── app.js             # mic capture + WS client + verdict rendering
│   ├── manifest.webmanifest
│   └── icons/
├── scripts/generate-icons.mjs
├── Dockerfile
└── docker-compose.yml
```

## Stack

- **Backend:** Node.js 20 + Express + `ws`
- **Transcription:** Deepgram nova-2 (linear16 PCM, diarization)
- **Fact-checking:** Anthropic Claude (`claude-haiku-4-5`)
- **Grounding:** Serper (Google search)
- **Frontend:** vanilla JS PWA — Web Audio mic capture, no build step

## Credit

Pipeline, prompts structure, and UI adapted from
[rpanigrahi222/intruth-factcheck](https://github.com/rpanigrahi222/intruth-factcheck).
Note: the public version of that project ships an empty `EVALUATE_PROMPT`; this
port supplies its own prompt that produces the same verdict structure.
