// Lexical / delivery-style analysis of a chunk of transcript.
// Ported verbatim from the original extension's service-worker so the
// "Speaker conviction" breakdown on each verdict card means the same thing.

const HEDGING_WORDS   = ['think','believe','maybe','perhaps','probably','might','could','seem','appears','guess','suppose','somewhat'];
const CERTAINTY_WORDS = ['definitely','certainly','absolutely','always','never','clearly','obviously','undoubtedly','exactly','proven'];
const FILLER_WORDS    = ['um','uh','like','basically','actually','literally','right','okay'];
const EMOTIONAL_WORDS = ['disaster','terrible','horrible','amazing','incredible','great','awful','fantastic','disgusting','wonderful','worst','best'];
const EXCLUSIVE_WORDS = ['but','except','however','although','unless','without','exclude'];
const FP_SINGULAR     = ['i','me','my','mine','myself'];

export function extractLexical(text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const total = words.length || 1;
  const rate = (list) => Math.round(words.filter(w => list.some(h => w.includes(h))).length / total * 100);
  return {
    rates: {
      hedging:       rate(HEDGING_WORDS),
      certainty:     rate(CERTAINTY_WORDS),
      filler:        rate(FILLER_WORDS),
      emotional:     rate(EMOTIONAL_WORDS),
      exclusive:     rate(EXCLUSIVE_WORDS),
      firstPersonSg: Math.round(words.filter(w => FP_SINGULAR.includes(w)).length / total * 100),
    },
    wordsPerSecond: null,
    wordCount: total,
  };
}

export function buildLexicalSummary(f) {
  const r = f.rates || f;
  const notes = [];
  if (r.hedging > 8)       notes.push(`hedging language (${r.hedging}%)`);
  if (r.certainty > 8)     notes.push(`certainty markers (${r.certainty}%)`);
  if (r.filler > 8)        notes.push(`filler words (${r.filler}%)`);
  if (r.emotional > 8)     notes.push(`emotional language (${r.emotional}%)`);
  if (r.exclusive > 8)     notes.push(`qualifying words (${r.exclusive}%)`);
  if (r.firstPersonSg > 8) notes.push(`first-person singular (${r.firstPersonSg}%)`);
  if (f.wordsPerSecond) {
    const pace = f.wordsPerSecond > 3.5 ? 'fast' : f.wordsPerSecond < 2 ? 'slow' : 'moderate';
    notes.push(`speech rate ${f.wordsPerSecond} w/s (${pace})`);
  }
  return notes.length ? `Features detected: ${notes.join(', ')}.` : 'Neutral delivery.';
}

export function emptyLexical() {
  return {
    rates: { hedging: 0, certainty: 0, filler: 0, emotional: 0, exclusive: 0, firstPersonSg: 0 },
    wordsPerSecond: null,
    wordCount: 0,
  };
}
