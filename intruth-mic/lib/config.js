// Runtime configuration / API keys.
//
// Keys are read from environment variables at startup, but can be overridden
// at runtime from the in-app Settings panel (handy for a personal deployment
// where you don't want to restart the container to change a key). Overrides
// live in memory only — set the env vars for anything permanent.

const fromEnv = {
  anthropic: process.env.ANTHROPIC_API_KEY || '',
  deepgram: process.env.DEEPGRAM_API_KEY || '',
  serper: process.env.SERPER_API_KEY || '',
};

const overrides = {
  anthropic: '',
  deepgram: '',
  serper: '',
};

export function getKeys() {
  return {
    anthropic: overrides.anthropic || fromEnv.anthropic,
    deepgram: overrides.deepgram || fromEnv.deepgram,
    serper: overrides.serper || fromEnv.serper,
  };
}

// Which keys are present — never expose the values themselves to the client.
export function getKeyStatus() {
  const k = getKeys();
  return {
    anthropic: Boolean(k.anthropic),
    deepgram: Boolean(k.deepgram),
    serper: Boolean(k.serper),
  };
}

export function setKeys(partial = {}) {
  for (const name of ['anthropic', 'deepgram', 'serper']) {
    if (typeof partial[name] === 'string' && partial[name].trim()) {
      overrides[name] = partial[name].trim();
    }
  }
  return getKeyStatus();
}

// Model used for claim extraction + verdicts. Haiku keeps latency low enough
// for a live feed; override with FACTCHECK_MODEL if you want a stronger model.
export const FACTCHECK_MODEL = process.env.FACTCHECK_MODEL || 'claude-haiku-4-5-20251001';
