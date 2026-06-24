// Anthropic (Claude) calls for claim extraction + verdicts.
//
// NOTE: the public version of the original extension shipped EVALUATE_PROMPT as
// an empty string (the real prompt was stripped before open-sourcing). The
// prompt below is authored to produce exactly the JSON shape the UI consumes:
// objects with claim / verdict / confidence / explanation / speaker /
// speaker_confidence. The verdict + confidence vocabularies match the badge
// colors and labels in the frontend.

import { getKeys, FACTCHECK_MODEL } from './config.js';

export const EVALUATE_PROMPT = `You are a real-time fact-checker analyzing a live spoken transcript (debate, speech, interview, or conversation). The transcript is rough — it comes from automatic speech recognition, so expect dropped words and imperfect punctuation.

Your job: pull out the CHECK-WORTHY factual claims and rule on each one.

A check-worthy claim is a specific, verifiable assertion about the world: a statistic, a historical fact, a number, a policy detail, an attribution of who said or did something, a cause-and-effect claim. IGNORE opinions, predictions about the future, value judgments, rhetorical questions, jokes, vague generalities, and pleasantries. If nothing in the transcript is check-worthy, return an empty array.

For each check-worthy claim, return an object with these exact fields:
- "claim": a concise, self-contained restatement of the factual assertion (one sentence, no speaker labels).
- "verdict": one of EXACTLY these strings:
    "TRUE"                — accurate and well supported.
    "SUBSTANTIALLY TRUE"  — core point is correct; minor imprecision.
    "FALSE"               — contradicted by the evidence.
    "MISLEADING"          — technically defensible but creates a false impression, or cherry-picks.
    "UNVERIFIABLE"        — cannot be confirmed or refuted from general knowledge / the provided evidence.
- "confidence": "HIGH", "MEDIUM", or "LOW" — your certainty in the verdict itself.
- "explanation": one or two plain sentences giving the correct facts and why you ruled this way. Be specific (cite the real number / date / fact). No hedging filler.
- "speaker": the name of the person who made the claim if you can determine it from context, otherwise null. NEVER output "Speaker 0", "Speaker 1", or any "Speaker N" label — resolve to a real name or use null.
- "speaker_confidence": "HIGH", "MEDIUM", or "LOW" — how confident you are about WHO made the claim (the attribution), independent of the claim's truth.

Rules:
- If web search results are provided, weigh them heavily and cite their facts in the explanation. If they are not provided, rule from your own knowledge and lean toward "UNVERIFIABLE" or "LOW" confidence when you are unsure.
- Do not re-check claims listed as already fact-checked this session.
- Output ONLY a JSON array of these objects. No prose, no markdown, no code fences. If there are no check-worthy claims, output exactly: []`;

export async function callClaude(userMessage, systemPrompt, onError) {
  const { anthropic } = getKeys();
  if (!anthropic) {
    if (onError) onError('Anthropic API key not set.');
    return '';
  }

  let data;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropic,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: FACTCHECK_MODEL,
        max_tokens: 768,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    data = await res.json();
  } catch (err) {
    console.error('[claude] network error:', err);
    if (onError) onError('Could not reach the Anthropic API.');
    return '';
  }

  if (data.error) {
    const msg = data.error.message || 'Unknown API error';
    console.error('[claude] API error:', msg);
    if (onError) onError(msg);
    return '';
  }

  const raw = data.content?.[0]?.text?.trim() || '';
  return raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
}

export function parseArray(str) {
  const start = str.indexOf('[');
  const end = str.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  try { return JSON.parse(str.slice(start, end + 1)); }
  catch { return []; }
}
