// A fact-checking session for one connected phone.
//
// Owns: the Deepgram WebSocket (transcription + diarization), the rolling
// transcript window, claim de-duplication, and the two-pass Claude pipeline
// (fast verdict, then web-grounded update). It is a faithful port of the
// original extension's service-worker + offscreen logic, with the audio source
// swapped from tab capture to the phone microphone (the browser streams PCM to
// us over a WebSocket instead of an offscreen document streaming to Deepgram).

import WebSocket from 'ws';
import { getKeys } from './config.js';
import { callClaude, parseArray, EVALUATE_PROMPT } from './claude.js';
import { searchWeb } from './serper.js';
import { extractLexical, buildLexicalSummary, emptyLexical } from './lexical.js';

const WINDOW_SIZE = 4;   // evaluate every N final sentences
const WINDOW_KEEP = 15;  // rolling context kept for Claude
const CLAIM_DEDUP_MS = 200000;

function parseSpeakersFromTitle(title) {
  if (!title) return [];
  const roleMatch = title.match(/(\d+)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:vs?\.?|versus)\s+(\d+)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (roleMatch) {
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    return [cap(roleMatch[2]), cap(roleMatch[4])];
  }
  const nameMatch = title.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:and|vs\.?|versus|&)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (nameMatch) {
    const clean = name => name.trim().split(' ').pop();
    return [clean(nameMatch[1]), clean(nameMatch[2])];
  }
  return [];
}

export class Session {
  constructor(send) {
    this.send = send;           // (obj) => void  — JSON to the phone
    this.deepgram = null;
    this.active = false;
    this.utteranceBuffer = '';

    // pipeline state
    this.recentClaims = new Map();     // key -> [timestamp, originalClaim]
    this.sentenceWindow = [];          // { text, speakerId, speakerName }
    this.sentenceCount = 0;
    this.windowLexical = emptyLexical();
    this.windowStartTime = null;
    this.title = '';
    this.date = '';
    this.currentSpeakerId = null;
    this.lastSpeakerId = null;
    this.speakerIdToName = {};         // confirmed: { 0: 'Harris' }
    this.confirmedSpeakers = new Set();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start({ sampleRate, context }) {
    if (this.active) this.stop();

    const { deepgram } = getKeys();
    if (!deepgram) {
      this.send({ type: 'PIPELINE_ERROR', message: 'Deepgram API key not set on the server.' });
      return;
    }

    this.active = true;
    this.title = (context || '').trim();
    this.date = '';
    const speakers = parseSpeakersFromTitle(this.title);
    this.send({ type: 'SESSION_STARTED', speakers });

    const rate = Number(sampleRate) || 16000;
    const url = 'wss://api.deepgram.com/v1/listen?' + [
      'encoding=linear16',
      `sample_rate=${rate}`,
      'channels=1',
      'model=nova-2',
      'language=en-US',
      'punctuate=true',
      'interim_results=true',
      'utterance_end_ms=2500',
      'smart_format=true',
      'vad_events=true',
      'diarize=true',
    ].join('&');

    this.deepgram = new WebSocket(url, {
      headers: { Authorization: `Token ${deepgram}` },
    });

    this.deepgram.on('open', () => console.log('[session] deepgram connected'));
    this.deepgram.on('message', (buf) => this._onDeepgramMessage(buf));
    this.deepgram.on('error', (err) => {
      console.error('[session] deepgram error:', err.message);
      this.send({ type: 'PIPELINE_ERROR', message: 'Transcription error — check the Deepgram key.' });
    });
    this.deepgram.on('close', (code) => {
      console.log('[session] deepgram closed:', code);
      if (this.active && (code === 1008 || code === 1011)) {
        this.send({ type: 'PIPELINE_ERROR', message: `Deepgram connection failed (code ${code}). Check the API key.` });
      }
    });
  }

  sendAudio(buf) {
    if (this.deepgram?.readyState === WebSocket.OPEN) {
      this.deepgram.send(buf);
    }
  }

  setSpeakerNames(map) {
    if (!map) return;
    for (const [id, name] of Object.entries(map)) {
      const numId = parseInt(id, 10);
      if (!this.confirmedSpeakers.has(numId)) {
        this.speakerIdToName[numId] = name;
        this.confirmedSpeakers.add(numId);
      }
    }
  }

  stop() {
    this.active = false;
    this.utteranceBuffer = '';
    if (this.deepgram) {
      try { this.deepgram.close(); } catch { /* ignore */ }
      this.deepgram = null;
    }
    // reset pipeline
    this.recentClaims.clear();
    this.sentenceWindow = [];
    this.sentenceCount = 0;
    this.windowLexical = emptyLexical();
    this.windowStartTime = null;
    this.currentSpeakerId = null;
    this.lastSpeakerId = null;
    this.speakerIdToName = {};
    this.confirmedSpeakers = new Set();
  }

  // ── Deepgram message handling (ported from offscreen.js) ─────────────────────

  _onDeepgramMessage(buf) {
    let data;
    try { data = JSON.parse(buf.toString()); }
    catch { return; }

    if (data.type === 'UtteranceEnd') return;

    const result = data.channel?.alternatives?.[0];
    if (!result || !result.transcript) return;

    const text = result.transcript.trim();
    const isFinal = data.is_final;
    const speech = data.speech_final;
    const speaker = result.words?.[0]?.speaker ?? null;
    if (!text) return;

    if (isFinal && speech) {
      const fullText = this.utteranceBuffer ? this.utteranceBuffer + ' ' + text : text;
      this.utteranceBuffer = '';
      this._onTranscript({ text: fullText.trim(), isFinal: true, interim: false, speaker });
    } else if (isFinal && !speech) {
      this.utteranceBuffer += (this.utteranceBuffer ? ' ' : '') + text;
      this._onTranscript({ text: this.utteranceBuffer, isFinal: false, interim: true, speaker });
    } else {
      this._onTranscript({ text, isFinal: false, interim: true, speaker });
    }
  }

  _onTranscript({ text, isFinal, interim, speaker }) {
    if (isFinal) {
      if (speaker !== null && speaker !== undefined) {
        this.currentSpeakerId = speaker;
        if (!this.confirmedSpeakers.has(speaker) && this.speakerIdToName[speaker] === undefined) {
          this.send({ type: 'NEW_SPEAKER', speakerId: speaker, sample: text.slice(0, 80) });
        }
      }
      this._onNewSentence(text, this.currentSpeakerId);
    }
    // forward to the phone's transcript feed
    this.send({ type: 'TRANSCRIPT_RESULT', text, isFinal, interim });
  }

  // ── Rolling window + claim dedup (ported from service-worker.js) ─────────────

  _normalizeClaimKey(claim) {
    return claim.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length >= 4)
      .sort()
      .join(' ');
  }

  _isDuplicate(claim) {
    const key = this._normalizeClaimKey(claim);
    const now = Date.now();

    for (const [k, v] of this.recentClaims) {
      const t = Array.isArray(v) ? v[0] : v;
      if (now - t > CLAIM_DEDUP_MS) this.recentClaims.delete(k);
    }
    if (this.recentClaims.has(key)) return true;

    const keyWords = new Set(key.split(' ').filter(Boolean));
    const figures = (claim.match(/\$[\d,.]+(?:\s*(?:trillion|billion|million|thousand))?/gi) || [])
      .map(d => d.replace(/[,\s]/g, '').toLowerCase());

    for (const [k, v] of this.recentClaims) {
      const kWords = k.split(' ').filter(Boolean);
      if (kWords.filter(w => keyWords.has(w)).length / Math.max(keyWords.size, kWords.length) >= 0.35) return true;
      if (figures.length) {
        const origClaim = Array.isArray(v) ? v[1] : '';
        if (origClaim) {
          const origFigures = (origClaim.match(/\$[\d,.]+(?:\s*(?:trillion|billion|million|thousand))?/gi) || [])
            .map(d => d.replace(/[,\s]/g, '').toLowerCase());
          if (figures.some(f => origFigures.includes(f))) return true;
        }
      }
    }

    this.recentClaims.set(key, [now, claim]);
    return false;
  }

  async _onNewSentence(text, speakerId) {
    // flush window early on a speaker change mid-window
    if (this.lastSpeakerId !== null &&
        speakerId !== null && speakerId !== undefined &&
        speakerId !== this.lastSpeakerId &&
        this.sentenceCount % WINDOW_SIZE !== 0 &&
        this.sentenceWindow.length >= 2) {
      const flushText = this.sentenceWindow.map(s => s.text).join(' ');
      const flushCounts = {};
      this.sentenceWindow.slice(-WINDOW_SIZE).forEach(s => {
        if (s.speakerId !== null && s.speakerId !== undefined)
          flushCounts[s.speakerId] = (flushCounts[s.speakerId] || 0) + 1;
      });
      const flushDominantId = Object.keys(flushCounts).length
        ? Object.entries(flushCounts).sort((a, b) => b[1] - a[1])[0][0] : null;
      const flushDominantSpeaker = flushDominantId !== null ? (this.speakerIdToName[flushDominantId] || null) : null;
      const flushSnapshot = JSON.parse(JSON.stringify(this.windowLexical));
      const flushSummary = buildLexicalSummary(flushSnapshot);
      this.windowLexical = emptyLexical();
      this.windowStartTime = null;
      await this._evaluateClaims(flushText, flushSummary, flushSnapshot, flushDominantSpeaker, flushDominantId);
    }
    this.lastSpeakerId = speakerId;

    const confirmedName = (speakerId !== null && speakerId !== undefined) ? this.speakerIdToName[speakerId] : null;
    const label = confirmedName
      ? `[${confirmedName}]`
      : (speakerId !== null && speakerId !== undefined ? `[Speaker ${speakerId}]` : null);
    const labeledText = label ? `${label} ${text}` : text;

    this.sentenceWindow.push({ text: labeledText, speakerId, speakerName: confirmedName });
    if (this.sentenceWindow.length > WINDOW_KEEP) this.sentenceWindow.shift();
    this.sentenceCount++;
    if (!this.windowStartTime) this.windowStartTime = Date.now();

    // accumulate lexical
    const f = extractLexical(text);
    const r = f.rates, wr = this.windowLexical.rates;
    wr.hedging       = Math.round((wr.hedging       + r.hedging)       / 2);
    wr.certainty     = Math.round((wr.certainty     + r.certainty)     / 2);
    wr.filler        = Math.round((wr.filler        + r.filler)        / 2);
    wr.emotional     = Math.round((wr.emotional     + r.emotional)     / 2);
    wr.exclusive     = Math.round((wr.exclusive     + r.exclusive)     / 2);
    wr.firstPersonSg = Math.round((wr.firstPersonSg + r.firstPersonSg) / 2);
    this.windowLexical.wordCount += f.wordCount;

    if (this.sentenceCount % WINDOW_SIZE !== 0) return;

    const contextText = this.sentenceWindow.map(s => s.text).join(' ');
    const currentWindowSentences = this.sentenceWindow.slice(-WINDOW_SIZE);
    const counts = {};
    currentWindowSentences.forEach(s => {
      if (s.speakerId !== null && s.speakerId !== undefined) counts[s.speakerId] = (counts[s.speakerId] || 0) + 1;
    });
    const dominantSpeakerId = Object.keys(counts).length
      ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] : null;
    const dominantSpeaker = dominantSpeakerId !== null ? (this.speakerIdToName[dominantSpeakerId] || null) : null;

    const elapsed = this.windowStartTime ? (Date.now() - this.windowStartTime) / 1000 : null;
    if (elapsed && elapsed > 0) this.windowLexical.wordsPerSecond = Math.round(this.windowLexical.wordCount / elapsed * 10) / 10;

    const lexicalSnapshot = JSON.parse(JSON.stringify(this.windowLexical));
    const lexicalSummary = buildLexicalSummary(lexicalSnapshot);
    this.windowLexical = emptyLexical();
    this.windowStartTime = null;

    try {
      await this._evaluateClaims(contextText, lexicalSummary, lexicalSnapshot, dominantSpeaker, dominantSpeakerId);
    } catch (e) {
      console.error('[session] evaluate error:', e);
    }
  }

  // ── Two-pass evaluation (ported from service-worker.js) ──────────────────────

  _buildSpeakerLegend() {
    const titleNames = parseSpeakersFromTitle(this.title || '');
    if (!titleNames.length) {
      return `\nIdentify speakers using first-person language, policy content, and speech patterns. Never output "Speaker N".`;
    }
    const nameList = titleNames.join(' and ');
    return `\nParticipants: ${nameList}.` +
      `\nSpeaker attribution rules:` +
      `\n- [Speaker N] labels indicate turn order only — do NOT map Speaker 0 to the first name listed.` +
      `\n- Identify speakers using: (1) first-person language — when someone says "I", "my plan", they ARE the speaker; (2) the content of what is said matched to each participant's known positions; (3) cross-references — participants refer to each other by name.` +
      `\n- If a third party / moderator is speaking, attribute to them if identifiable, otherwise use null.` +
      `\n- NEVER output "Speaker N" or any [Speaker N] format in any field.`;
  }

  async _evaluateClaims(contextText, lexicalSummary, lexicalSnapshot, dominantSpeaker, dominantSpeakerId) {
    const dateContext = this.date ? `\nDate: ${this.date}` : '';
    const titleContext = this.title
      ? `Context: "${this.title}"${dateContext}${this._buildSpeakerLegend()}\n\n`
      : this._buildSpeakerLegend() + '\n\n';
    const lexicalContext = lexicalSummary ? `\n\nLexical analysis: ${lexicalSummary}` : '';

    const checkedList = [...this.recentClaims.values()]
      .filter(v => Array.isArray(v) && v[1]).map(v => v[1]).slice(-15).join('\n- ');
    const alreadyChecked = checkedList
      ? `\n\nClaims already fact-checked this session — do NOT re-evaluate these or close variants:\n- ${checkedList}\n` : '';

    const raw = await callClaude(
      `${titleContext}Transcript: "${contextText}"${alreadyChecked}${lexicalContext}`,
      EVALUATE_PROMPT,
      (m) => this.send({ type: 'PIPELINE_ERROR', message: m }),
    );
    const results = parseArray(raw);
    const valid = results.filter(r => r.claim && r.verdict && !this._isDuplicate(r.claim));
    if (!valid.length) return;

    this.send({
      type: 'NEW_VERDICT',
      results: valid.map(r => ({
        ...r,
        sources: [],
        pending: true,
        lexical: lexicalSnapshot,
        dominantSpeakerId,
        speaker: dominantSpeaker || (r.speaker && !/^Speaker\s*\d+$/i.test(r.speaker) ? r.speaker : null),
      })),
    });

    this._groundAndUpdate(contextText, valid, lexicalSummary, lexicalSnapshot, dominantSpeaker, dominantSpeakerId);
  }

  async _groundAndUpdate(contextText, fastResults, lexicalSummary, lexicalSnapshot, dominantSpeaker, dominantSpeakerId) {
    const dateCtx = this.date ? `\nDate: ${this.date}` : '';
    const titleContext = this.title ? `Context: "${this.title}"${dateCtx}\n\n` : '';
    const lexicalContext = lexicalSummary ? `\n\nLexical analysis: ${lexicalSummary}` : '';

    const grounded = await Promise.all(fastResults.map(async (fastResult) => {
      try {
        const urls = await searchWeb(fastResult.claim);
        if (!urls.length) return null; // no web evidence — keep the fast verdict as-is
        const raw = await callClaude(
          `${titleContext}Transcript: "${contextText}"\n\nEvaluate ONLY this specific claim:\n1. ${fastResult.claim}\n\nWeb search results:\n${urls.join('\n')}${lexicalContext}`,
          EVALUATE_PROMPT,
          (m) => this.send({ type: 'PIPELINE_ERROR', message: m }),
        );
        const results = parseArray(raw);
        const match = results.find(r => r.claim && r.verdict);
        if (!match) return null;

        const lateResolved = (dominantSpeakerId !== null && dominantSpeakerId !== undefined)
          ? this.speakerIdToName[dominantSpeakerId] || null : null;
        const resolvedSpeaker = lateResolved || dominantSpeaker
          || (match.speaker && !/^Speaker\s*\d+$/i.test(match.speaker) ? match.speaker : null)
          || (fastResult.speaker && !/^Speaker\s*\d+$/i.test(fastResult.speaker) ? fastResult.speaker : null);

        // never downgrade a clean TRUE to MISLEADING in the grounded pass
        const fastWasTrue = fastResult.verdict === 'TRUE' || fastResult.verdict === 'SUBSTANTIALLY TRUE';
        const finalVerdict = (fastWasTrue && match.verdict === 'MISLEADING') ? fastResult.verdict : match.verdict;

        return { ...match, verdict: finalVerdict, sources: urls, pending: false, lexical: lexicalSnapshot, speaker: resolvedSpeaker, dominantSpeakerId };
      } catch (err) {
        console.error('[session] grounded error:', err);
        return null;
      }
    }));

    const valid = grounded.filter(Boolean);
    if (valid.length) this.send({ type: 'UPDATE_VERDICTS', results: valid });
  }
}
