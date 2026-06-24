// InTruth Mic — frontend.
// Captures the phone microphone, streams 16-bit PCM to the server over a
// WebSocket, and renders the transcript / claims / verdicts feed. The rendering
// + speaker-attribution logic is ported from the original extension's overlay.

'use strict';

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Elements ──────────────────────────────────────────────────────────────────
const liveDot       = $('liveDot');
const statusText    = $('statusText');
const statusbar     = $('statusbar');
const ctxLabel      = $('ctxLabel');
const transcriptFeed= $('transcript-feed');
const interimEl     = $('interim');
const claimFeed     = $('claim-feed');
const verdictListEl = $('verdicts');
const speakerEditor = $('speaker-editor');
const errorsEl      = $('errors');
const micBtn        = $('mic-btn');
const micLabel      = $('micLabel');

// ── State ─────────────────────────────────────────────────────────────────────
let ws = null;
let audioCtx = null;
let mediaStream = null;
let processor = null;
let recording = false;
let context = localStorage.getItem('intruth.context') || '';

let speakers = [];
const SPEAKER_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316'];
const speakerColorMap = new Map();
const confirmedSpeakerMap = {}; // { speakerId: 'Harris' | null }
const pendingSpeakerIds = new Set();
const pendingCards = new Map();
const pendingCardTimes = new Map();
const verdictLog = [];

function getSpeakerColor(name) {
  if (!speakerColorMap.has(name)) {
    speakerColorMap.set(name, SPEAKER_COLORS[speakerColorMap.size % SPEAKER_COLORS.length]);
  }
  return speakerColorMap.get(name);
}

function normalizeSpeakerName(name) {
  if (!name) return name;
  for (const speaker of speakers) {
    const lastName = speaker.trim().split(' ').pop().toLowerCase();
    if (name.toLowerCase() === speaker.toLowerCase()) return speaker;
    if (name.toLowerCase().includes(lastName)) return speaker;
  }
  return name;
}

// expire pending cards after 90s
setInterval(() => {
  const now = Date.now();
  for (const [key, t] of pendingCardTimes) {
    if (now - t > 90000) {
      const card = pendingCards.get(key);
      if (card) {
        card.classList.remove('verdict--pending');
        const v = card.querySelector('.verifying');
        if (v) v.textContent = '⚠ unverified';
      }
      pendingCards.delete(key);
      pendingCardTimes.delete(key);
    }
  }
}, 15000);

// ── Transcript ────────────────────────────────────────────────────────────────
function addTranscriptText(text) {
  const span = document.createElement('span');
  span.textContent = text + ' ';
  transcriptFeed.appendChild(span);
  transcriptFeed.scrollTop = transcriptFeed.scrollHeight;
}
function updateInterim(text) { interimEl.textContent = text; }
function clearInterim() { interimEl.textContent = ''; }

// ── Claims ────────────────────────────────────────────────────────────────────
function addClaimBullet(claim) {
  const li = document.createElement('li');
  li.className = 'claim-bullet claim-bullet--pending';
  li.textContent = claim;
  claimFeed.appendChild(li);
}
function applyVerdictToBullet(claim, verdict, confidence) {
  const color = colorForVerdict(verdict, confidence);
  const claimWords = new Set(claim.toLowerCase().split(/\s+/).filter(w => w.length >= 4));
  let best = null, bestScore = 0;
  for (const li of claimFeed.querySelectorAll('.claim-bullet')) {
    const words = (li.textContent || '').toLowerCase().split(/\s+/).filter(w => w.length >= 4);
    const overlap = words.filter(w => claimWords.has(w)).length;
    const score = overlap / Math.max(claimWords.size, words.length);
    if (score > bestScore) { bestScore = score; best = li; }
  }
  if (best && bestScore >= 0.3) best.className = 'claim-bullet claim-bullet--' + color;
}

// ── Verdicts ──────────────────────────────────────────────────────────────────
function colorForVerdict(verdict, confidence) {
  if (confidence === 'LOW') return 'yellow';
  if (verdict === 'TRUE') return 'green';
  if (verdict === 'SUBSTANTIALLY TRUE') return 'teal';
  if (verdict === 'FALSE') return 'red';
  if (verdict === 'MISLEADING') return 'yellow';
  if (verdict === 'UNVERIFIABLE') return 'grey';
  return 'grey';
}

function buildLexicalRows(lexical) {
  if (!lexical) return '';
  const rows = [];
  const r = lexical.rates || {};
  const add = (label, val, eg) => rows.push(
    `<div class="conviction-row"><span class="conviction-label">${label}:</span> ${val}% rate${eg ? ' — e.g. ' + eg : ''}</div>`);
  if (r.hedging > 0)       add('Hedging language', r.hedging, '"I think", "maybe", "probably"');
  if (r.certainty > 0)     add('Certainty markers', r.certainty, '"definitely", "always"');
  if (r.filler > 0)        add('Filler words', r.filler, '"um", "like", "you know"');
  if (r.emotional > 0)     add('Emotional language', r.emotional, '');
  if (r.exclusive > 0)     add('Qualifying words', r.exclusive, '"but", "except"');
  if (r.firstPersonSg > 0) add('First-person singular', r.firstPersonSg, '');
  if (lexical.wordsPerSecond != null) {
    const d = lexical.wordsPerSecond > 3.5 ? 'fast' : lexical.wordsPerSecond < 2 ? 'slow' : 'moderate';
    rows.push(`<div class="conviction-row"><span class="conviction-label">Speech rate:</span> ${lexical.wordsPerSecond} w/s (${d})</div>`);
  }
  return rows.join('');
}

function allSpeakersConfirmed() {
  const confirmedNames = Object.values(confirmedSpeakerMap).filter(v => v !== null);
  return confirmedNames.length >= Math.min(speakers.length, Object.keys(confirmedSpeakerMap).length)
    && Object.keys(confirmedSpeakerMap).length > 0;
}

function buildCard(result) {
  const color = colorForVerdict(result.verdict, result.confidence);
  const convictionColor = result.speaker_confidence === 'HIGH' ? 'green'
    : result.speaker_confidence === 'LOW' ? 'red' : 'yellow';

  const card = document.createElement('div');
  card.className = 'verdict verdict--' + color + (result.pending ? ' verdict--pending' : '');
  if (result.dominantSpeakerId !== null && result.dominantSpeakerId !== undefined) {
    card.dataset.speakerid = String(result.dominantSpeakerId);
  }
  card._resultData = result;

  const sourcesHTML = (result.sources ?? []).map((url, i) => {
    const isUrl = url.startsWith('http://') || url.startsWith('https://');
    return isUrl
      ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Source ${i + 1}</a>`
      : `<span class="source-text">${escapeHtml(url)}</span>`;
  }).join('');

  let speakerTag = '';
  if (!result.pending && allSpeakersConfirmed()) {
    const confirmedName = (result.dominantSpeakerId !== null && result.dominantSpeakerId !== undefined)
      ? confirmedSpeakerMap[result.dominantSpeakerId] : undefined;
    const raw = (confirmedName !== undefined && confirmedName !== null) ? confirmedName : (result.speaker || null);
    const normalized = raw ? normalizeSpeakerName(raw) : null;
    const speakerName = (normalized && !/^Speaker\s*\d+$/i.test(normalized)) ? normalized : null;
    if (speakerName) {
      speakerTag = `<div class="speaker-tag" style="background:${getSpeakerColor(speakerName)}">${escapeHtml(speakerName)}</div>`;
    }
  }

  card.innerHTML = [
    speakerTag,
    '<div class="verdict-header">',
      `<span class="badge badge--${color}">${escapeHtml(result.verdict)}</span>`,
      result.pending ? '<span class="verifying">⟳ verifying…</span>' : '',
      `<span class="confidence-right">${escapeHtml(result.confidence || '')} certainty</span>`,
    '</div>',
    `<p class="claim">"${escapeHtml(result.claim)}"</p>`,
    `<p class="explanation">${escapeHtml(result.explanation || '')}</p>`,
    '<div class="speaker-confidence">',
      '<button class="speaker-toggle">',
        `<span class="speaker-dot speaker-dot--${convictionColor}"></span>`,
        `Speaker conviction: ${escapeHtml(result.speaker_confidence || 'N/A')}`,
        '<span class="speaker-arrow">▾</span>',
      '</button>',
      `<div class="speaker-explanation" style="display:none">${buildLexicalRows(result.lexical)}</div>`,
    '</div>',
    (sourcesHTML && sourcesHTML.trim()) ? `<div class="sources">${sourcesHTML}</div>` : '',
  ].join('');

  const toggle = card.querySelector('.speaker-toggle');
  const reasons = card.querySelector('.speaker-explanation');
  const arrow = card.querySelector('.speaker-arrow');
  toggle.addEventListener('click', () => {
    const open = reasons.style.display === 'none';
    reasons.style.display = open ? 'block' : 'none';
    arrow.textContent = open ? '▴' : '▾';
  });
  return card;
}

function findPendingCard(claim) {
  const key = claim.toLowerCase().slice(0, 40);
  if (pendingCards.has(key)) return pendingCards.get(key);
  const claimWords = new Set(claim.toLowerCase().split(/\s+/).filter(w => w.length >= 4));
  let best = null, bestScore = 0;
  for (const [cardKey, card] of pendingCards) {
    const words = cardKey.split(/\s+/).filter(w => w.length >= 4);
    const overlap = words.filter(w => claimWords.has(w)).length;
    const score = overlap / Math.max(claimWords.size, words.length);
    if (score > bestScore) { bestScore = score; best = card; }
  }
  if (bestScore >= 0.4) return best;
  return verdictListEl.querySelector('.verdict--pending');
}

function addVerdict(result) {
  verdictListEl.querySelector('.empty')?.remove();
  applyVerdictToBullet(result.claim, result.verdict, result.confidence);
  const card = buildCard(result);
  if (result.pending) {
    const key = result.claim.toLowerCase().slice(0, 40);
    pendingCards.set(key, card);
    pendingCardTimes.set(key, Date.now());
  } else {
    verdictLog.push(result);
  }
  verdictListEl.prepend(card);
}

function updateVerdict(result) {
  const existing = findPendingCard(result.claim);
  if (existing && existing.dataset.speakerid && (result.dominantSpeakerId === null || result.dominantSpeakerId === undefined)) {
    result.dominantSpeakerId = existing.dataset.speakerid;
  }
  const card = buildCard(result);
  if (existing) {
    existing.replaceWith(card);
    for (const [k, v] of pendingCards) {
      if (v === existing) { pendingCards.delete(k); pendingCardTimes.delete(k); break; }
    }
  } else {
    verdictListEl.querySelector('.empty')?.remove();
    verdictListEl.prepend(card);
  }
  applyVerdictToBullet(result.claim, result.verdict, result.confidence);
  verdictLog.push(result);
}

// ── Speaker confirmation banner ───────────────────────────────────────────────
function showSpeakerBanner(speakerId, sample) {
  if (pendingSpeakerIds.has(speakerId) || speakerId in confirmedSpeakerMap) return;
  if (!speakers.length) {
    // no participants given — auto-name as "Speaker N+1" so cards still tag
    confirmedSpeakerMap[speakerId] = null;
    return;
  }
  pendingSpeakerIds.add(speakerId);

  const banner = document.createElement('div');
  banner.className = 'speaker-banner';
  banner.innerHTML =
    '<div class="speaker-banner-text">New speaker detected — who is this?</div>' +
    `<div class="speaker-banner-sample">"${escapeHtml(sample)}…"</div>` +
    '<div class="speaker-banner-buttons">' +
      speakers.map(name => `<button class="speaker-banner-btn" data-name="${escapeHtml(name)}" data-id="${speakerId}">${escapeHtml(name)}</button>`).join('') +
      `<button class="speaker-banner-btn speaker-banner-btn--skip" data-id="${speakerId}">Skip</button>` +
    '</div>';

  banner.querySelectorAll('.speaker-banner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const id = parseInt(btn.dataset.id, 10);
      if (name) {
        confirmedSpeakerMap[id] = name;
        wsSend({ type: 'speakerNames', speakerIdToName: { [id]: name } });
      } else {
        confirmedSpeakerMap[id] = null;
      }
      pendingSpeakerIds.delete(id);
      banner.remove();
      retryTagAllCards();
    });
  });

  $('verdicts-section').insertAdjacentElement('beforebegin', banner);
}

function retryTagAllCards() {
  verdictListEl.querySelectorAll('.verdict:not(.verdict--pending)').forEach(card => {
    const sid = card.dataset.speakerid;
    if (sid === undefined) return;
    const rawName = confirmedSpeakerMap[sid];
    if (!rawName) return;
    const name = normalizeSpeakerName(rawName);
    let tag = card.querySelector('.speaker-tag');
    if (tag) { tag.textContent = name; tag.style.background = getSpeakerColor(name); }
    else {
      tag = document.createElement('div');
      tag.className = 'speaker-tag';
      tag.style.background = getSpeakerColor(name);
      tag.textContent = name;
      card.insertBefore(tag, card.firstChild);
    }
  });
}

// ── Speaker editor chips ──────────────────────────────────────────────────────
function renderSpeakerEditor() {
  if (!speakers.length) { speakerEditor.innerHTML = ''; return; }
  speakerEditor.innerHTML = speakers.map((name, i) => {
    const color = getSpeakerColor(name);
    return `<span class="speaker-chip" style="border-color:${color};color:${color}" data-idx="${i}">` +
      `<input class="speaker-chip-input" value="${escapeHtml(name)}" data-idx="${i}" style="color:${color}" /></span>`;
  }).join('');

  speakerEditor.querySelectorAll('.speaker-chip-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const oldName = speakers[idx];
      const newName = e.target.value.trim() || oldName;
      if (newName === oldName) return;
      if (speakerColorMap.has(oldName)) {
        speakerColorMap.set(newName, speakerColorMap.get(oldName));
        speakerColorMap.delete(oldName);
      }
      speakers[idx] = newName;
      const color = getSpeakerColor(newName);
      e.target.style.color = color;
      e.target.closest('.speaker-chip').style.borderColor = color;
      e.target.closest('.speaker-chip').style.color = color;
      sendSpeakerMap();
      verdictListEl.querySelectorAll('.speaker-tag').forEach(tag => {
        if (tag.textContent === oldName) { tag.textContent = newName; tag.style.background = color; }
      });
    });
    input.addEventListener('focus', e => e.target.select());
  });
}

function sendSpeakerMap() {
  const speakerIdToName = {};
  speakers.forEach((name, i) => { speakerIdToName[i] = name; });
  wsSend({ type: 'speakerNames', speakerIdToName });
}

// ── Error toast ───────────────────────────────────────────────────────────────
function showError(message) {
  errorsEl.innerHTML = '';
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.innerHTML =
    '<span class="error-icon">⚠</span>' +
    `<span class="error-msg">${escapeHtml(message)}</span>` +
    '<button class="error-close">✕</button>';
  toast.querySelector('.error-close').addEventListener('click', () => toast.remove());
  errorsEl.appendChild(toast);
  if (!/failed|key/i.test(message)) setTimeout(() => toast.remove(), 8000);
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function wsSend(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'SESSION_STARTED':
      speakers = msg.speakers || [];
      speakerColorMap.clear();
      renderSpeakerEditor();
      break;
    case 'TRANSCRIPT_RESULT':
      if (msg.interim) updateInterim(msg.text);
      else if (msg.isFinal) {
        clearInterim();
        addTranscriptText(msg.text.replace(/^\[.*?\]\s*/, ''));
      }
      break;
    case 'NEW_SPEAKER':
      showSpeakerBanner(msg.speakerId, msg.sample || '');
      break;
    case 'NEW_VERDICT':
      (msg.results || []).forEach(r => { addClaimBullet(r.claim); addVerdict(r); });
      break;
    case 'UPDATE_VERDICTS':
      (msg.results || []).forEach(r => updateVerdict(r));
      break;
    case 'PIPELINE_ERROR':
      showError(msg.message || 'An error occurred in the fact-checking pipeline.');
      break;
  }
}

// ── Mic capture + session control ─────────────────────────────────────────────
async function startRecording() {
  try {
    // request mic INSIDE the user gesture (required by iOS Safari)
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      video: false,
    });
  } catch (err) {
    showError('Microphone access denied. Allow the mic and try again.');
    return;
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  try { await audioCtx.resume(); } catch { /* ignore */ }

  const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  ws = new WebSocket(wsUrl);
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    wsSend({ type: 'start', sampleRate: audioCtx.sampleRate, context });
    startAudioPipeline();
    setRecordingUI(true);
  };
  ws.onmessage = (e) => {
    try { handleMessage(JSON.parse(e.data)); } catch { /* ignore */ }
  };
  ws.onerror = () => showError('Connection error.');
  ws.onclose = () => { if (recording) stopRecording(); };
}

function startAudioPipeline() {
  const source = audioCtx.createMediaStreamSource(mediaStream);
  processor = audioCtx.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = (e) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const float32 = e.inputBuffer.getChannelData(0);
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
    }
    ws.send(int16.buffer);
  };
  // route through a muted gain so the processor runs without echoing the mic
  const mute = audioCtx.createGain();
  mute.gain.value = 0;
  source.connect(processor);
  processor.connect(mute);
  mute.connect(audioCtx.destination);
}

function stopRecording() {
  recording = false;
  wsSend({ type: 'stop' });
  if (processor) { processor.disconnect(); processor = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
  if (ws) { try { ws.close(); } catch {} ws = null; }
  setRecordingUI(false);
}

function setRecordingUI(on) {
  recording = on;
  liveDot.classList.toggle('on', on);
  micBtn.classList.toggle('recording', on);
  statusbar.classList.toggle('active', on);
  micBtn.querySelector('.mic-glyph').innerHTML = on ? '<span class="rec-ring"></span>' : '🎙';
  micLabel.textContent = on ? 'Stop' : 'Start Fact-Checking';
  statusText.textContent = on ? 'Listening…' : 'Tap the mic to start listening';
  ctxLabel.textContent = context ? context : '';
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const { keys } = await res.json();
    $('dgState').textContent = keys.deepgram ? '✓ set' : '';
    $('anState').textContent = keys.anthropic ? '✓ set' : '';
    $('seState').textContent = keys.serper ? '✓ set' : '';
    if (!keys.deepgram || !keys.anthropic) {
      statusText.textContent = 'Add your API keys in Settings ⚙ to begin';
    }
  } catch { /* ignore */ }
}

function openSettings() {
  $('contextInput').value = context;
  $('ctxState').textContent = '';
  ['deepgramInput', 'anthropicInput', 'serperInput'].forEach(id => { $(id).value = ''; });
  $('settingsModal').classList.add('open');
}
function closeSettings() { $('settingsModal').classList.remove('open'); }

async function saveSettings() {
  context = $('contextInput').value.trim();
  localStorage.setItem('intruth.context', context);
  ctxLabel.textContent = context;

  const body = {
    deepgram: $('deepgramInput').value.trim(),
    anthropic: $('anthropicInput').value.trim(),
    serper: $('serperInput').value.trim(),
  };
  if (body.deepgram || body.anthropic || body.serper) {
    try { await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    catch { showError('Could not save keys to the server.'); }
  }
  await loadStatus();
  closeSettings();
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportSession() {
  if (!verdictLog.length) { showError('No verdicts to export yet.'); return; }
  const lines = ['InTruth — session export', new Date().toLocaleString(), context ? 'Context: ' + context : '', ''];
  verdictLog.forEach(r => {
    lines.push(`[${r.verdict}] (${r.confidence} certainty)${r.speaker ? ' — ' + r.speaker : ''}`);
    lines.push(`Claim: "${r.claim}"`);
    lines.push(`${r.explanation || ''}`);
    if (r.sources?.length) lines.push('Sources: ' + r.sources.join(', '));
    lines.push('');
  });
  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `intruth-session-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Wiring ────────────────────────────────────────────────────────────────────
micBtn.addEventListener('click', () => { recording ? stopRecording() : startRecording(); });
$('settingsBtn').addEventListener('click', openSettings);
$('settingsCancel').addEventListener('click', closeSettings);
$('settingsSave').addEventListener('click', saveSettings);
$('exportBtn').addEventListener('click', exportSession);
$('settingsModal').addEventListener('click', (e) => { if (e.target.id === 'settingsModal') closeSettings(); });

let transcriptCollapsed = false;
$('transcriptToggle').addEventListener('click', () => {
  transcriptCollapsed = !transcriptCollapsed;
  transcriptFeed.style.display = transcriptCollapsed ? 'none' : '';
  interimEl.style.display = transcriptCollapsed ? 'none' : '';
  $('transcriptToggle').textContent = transcriptCollapsed ? '▸' : '▾';
});

loadStatus();
if (context) ctxLabel.textContent = context;
