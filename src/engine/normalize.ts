/**
 * Normalisation + tokenisation.
 *
 * We deliberately keep this layer dumb and inspectable. Anything clever
 * happens later, against tokens the operator can reproduce by hand.
 */

const CONTRACTIONS: Record<string, string> = {
  "don't": 'do not',
  "dont": 'do not',
  "doesn't": 'does not',
  "doesnt": 'does not',
  "didn't": 'did not',
  "didnt": 'did not',
  "can't": 'cannot',
  "cant": 'cannot',
  "couldn't": 'could not',
  "couldnt": 'could not',
  "won't": 'will not',
  "wont": 'will not',
  "wouldn't": 'would not',
  "wouldnt": 'would not',
  "shouldn't": 'should not',
  "isn't": 'is not',
  "isnt": 'is not',
  "aren't": 'are not',
  "arent": 'are not',
  "wasn't": 'was not',
  "wasnt": 'was not',
  "weren't": 'were not',
  "ain't": 'is not',
  "aint": 'is not',
  "haven't": 'have not',
  "havent": 'have not',
  "hasn't": 'has not',
  "i'm": 'i am',
  "im": 'i am',
  "i've": 'i have',
  "ive": 'i have',
  "i'll": 'i will',
  "i'd": 'i would',
  "you're": 'you are',
  "youre": 'you are',
  "we're": 'we are',
  "they're": 'they are',
  "it's": 'it is',
  "that's": 'that is',
  "there's": 'there is',
  "let's": 'let us',
  "gonna": 'going to',
  "wanna": 'want to',
  "gotta": 'got to',
  "cuz": 'because',
  "coz": 'because',
  "cos": 'because',
  "pls": 'please',
  "plz": 'please',
  "thru": 'through',
  "nite": 'night',
  "tmrw": 'tomorrow',
  "tomo": 'tomorrow',
  "b4": 'before',
  "u": 'you',
  "ur": 'your',
  "smh": 'disappointed',
  "idk": 'i do not know',
  "tbh": 'to be honest',
  "ngl": 'not going to lie',
};

/** Ghanaian English / Pidgin spelling variants mapped to their standard form. */
const SPELLING_VARIANTS: Record<string, string> = {
  k3k3: 'small',
  k33k3: 'small',
  kek3: 'small',
  keke: 'small',
  chale: 'chale',
  charley: 'chale',
  charlie: 'chale',
  'dey': 'dey',
  wetin: 'what',
  sabi: 'know',
  'no be': 'not',
  'na': 'is',
  'sef': 'even',
  'kraa': 'at all',
  'koraa': 'at all',
  'paa': 'very',
  'eii': 'hey',
  'ei': 'hey',
  'ei!': 'hey',
  'hmmm': 'hmm',
  'hmm': 'hmm',
  'abeg': 'please',
  'mepa': 'please',
  'medaase': 'thank',
  'medaasi': 'thank',
  'daase': 'thank',
  'wahala': 'trouble',
  'dumsor': 'power cut',
  'trotro': 'bus',
  'okada': 'motorbike',
};

/** Words that count as Ghanaian-English / Pidgin markers. */
export const GHANAIAN_MARKERS = new Set([
  'chale', 'charley', 'abeg', 'wahala', 'dey', 'sef', 'kraa', 'koraa', 'paa',
  'trotro', 'okada', 'dumsor', 'waakye', 'kenkey', 'banku', 'fufu', 'jollof',
  'sachet', 'shito', 'kelewele', 'suya', 'harmattan', 'chop', 'chopbar',
  'medaase', 'awerɛhow', 'awerɛho', 'akoma', 'aboa', 'gyim', 'suro',
  'abufuo', 'anigye', 'nkommo', 'obroni', 'sista', 'bro', 'senior',
  'small', 'make', 'wetin', 'sabi', 'shey', 'eii', 'ei', 'hmm', 'hmmm',
  'ei', 'oya', 'herh', 'kwasia', 'nonsense', 'wayo', 'gbe', 'gbee',
]);

export interface PreparedText {
  /** Lowercased, contraction-expanded text with sentence punctuation kept. */
  text: string;
  /** Clause tokens; `|` marks a clause boundary. */
  tokens: string[];
  /** Token index → whether the source token was SHOUTED or elongated. */
  emphasis: boolean[];
  /** Emoji / emoticon valence evidence. */
  emojiValence: number;
  emojis: string[];
  /** Number of exclamation marks (capped later, VADER-style). */
  exclamations: number;
  /** Raw Ghanaian marker tokens found (pre-normalisation). */
  markerTokens: string[];
  wordCount: number;
  endsWithQuestion: boolean;
}

export const EMOJI_VALENCE: Record<string, number> = {
  '😊': 2.2, '😁': 2.3, '😄': 2.2, '🙂': 1.3, '😌': 1.4, '🥰': 2.5,
  '😍': 2.6, '❤️': 2.4, '💚': 2.0, '🙏': 1.4, '🫂': 1.6, '✨': 1.2,
  '🎉': 2.0, '💪': 1.5, '😂': 1.8, '🤣': 1.8, '😢': -2.1, '😭': -2.6,
  '💔': -2.9, '😞': -2.2, '😔': -2.0, '☹️': -2.0, '🙁': -1.8, '😟': -1.6,
  '😰': -2.1, '😨': -2.3, '😱': -2.4, '😖': -2.2, '😫': -2.1, '😩': -2.0,
  '😡': -2.6, '🤬': -3.0, '😤': -1.4, '😐': -0.4, '😶': -0.9, '🫥': -1.4,
  '😴': 0.2, '🥲': -0.6, '😳': -0.8, '🤯': -1.2, '😵': -1.6, '🪫': -1.4,
  '🖤': -0.6, '💀': 0, '🥀': -1.8, '🌧️': -1.2, '🌑': -1.0, '⛓️': -1.4,
};

const EMOTICONS: Record<string, number> = {
  ':)': 1.6, ':-)': 1.6, '=)': 1.5, ':d': 2.0, ':-d': 2.0, '<3': 2.2,
  ':(': -1.8, ':-(': -1.8, '=(': -1.7, ":'(": -2.4, '</3': -2.6, ':/': -0.9,
  ':|': -0.2, 'd:': -1.6, '):': -1.6,
};

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const HANDLE_RE = /@[a-z0-9_]+/gi;

export function prepare(raw: string): PreparedText {
  const markerTokens: string[] = [];
  const emojis: string[] = [];
  let emojiValence = 0;

  // Emoji pass runs against the original text so we never lose them.
  for (const char of Array.from(raw)) {
    if (EMOJI_VALENCE[char] !== undefined) {
      emojis.push(char);
      emojiValence += EMOJI_VALENCE[char];
    }
  }

  let text = raw
    .replace(URL_RE, ' ')
    .replace(HANDLE_RE, ' ')
    .replace(/[’‘`´]/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/[—–]/g, ', ');

  const exclamations = (text.match(/!/g) ?? []).length;
  const endsWithQuestion = /\?\s*$/.test(text);

  // Lowercase for lexicon work but remember shoutiness per token later.
  const originalTokens = text.split(/(\s+)/);

  text = text.toLowerCase();

  // Emoticons (they contain punctuation, so they must be scored before cleanup)
  for (const [emoticon, value] of Object.entries(EMOTICONS)) {
    if (text.includes(emoticon)) {
      emojiValence += value * 0.8;
      emojis.push(emoticon);
      text = text.split(emoticon).join(' ');
    }
  }

  // Contractions + spelling variants
  for (const [from, to] of Object.entries(CONTRACTIONS)) {
    text = text.replace(new RegExp(`\\b${escapeRe(from)}\\b`, 'g'), to);
  }

  // Ghanaian spellings / particles (word-ish boundaries for mixed scripts)
  for (const [from, to] of Object.entries(SPELLING_VARIANTS)) {
    const re = new RegExp(`(^|\\s)${escapeRe(from)}(?=\\s|$|[.,!?])`, 'gi');
    text = text.replace(re, (m, prefix: string) => {
      const found = m.trim().toLowerCase();
      if (GHANAIAN_MARKERS.has(found)) markerTokens.push(found);
      return `${prefix}${to}`;
    });
  }

  // Collapse elongated words: sooooo -> so, tiiired -> tired
  text = text.replace(/([a-z])\1{2,}/g, '$1$1');

  // Sentence punctuation becomes an explicit clause boundary token.
  text = text.replace(/[.!?;:,]+/g, ' | ');
  text = text.replace(/[^a-z0-9'|\s-]/g, ' ');

  const words = text.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  const emphasis: boolean[] = [];

  // Map emphasis by matching lowercased source tokens.
  const loud = new Set<string>();
  for (const part of originalTokens) {
    const t = part.trim();
    if (t.length > 2 && t === t.toUpperCase() && /[A-Z]/.test(t)) {
      loud.add(t.toLowerCase().replace(/([a-z])\1{2,}/g, '$1$1'));
    }
  }

  for (const w of words) {
    if (w === '|') {
      if (tokens[tokens.length - 1] !== '|') tokens.push('|');
      continue;
    }
    tokens.push(w);
    emphasis.push(loud.has(w));
  }

  for (const t of tokens) {
    if (GHANAIAN_MARKERS.has(t)) markerTokens.push(t);
  }

  const wordCount = tokens.filter((t) => t !== '|').length;

  return {
    text: tokens.join(' '),
    tokens,
    emphasis,
    emojiValence,
    emojis,
    exclamations,
    markerTokens: Array.from(new Set(markerTokens)),
    wordCount,
    endsWithQuestion,
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Find a phrase in the writer's original text so we can quote it back. */
export function locatePhrase(original: string, phrase: string): string {
  const clean = phrase.replace(/\s+/g, ' ').trim();
  if (!clean) return phrase;
  const direct = original.toLowerCase().indexOf(clean.toLowerCase());
  if (direct >= 0) return original.slice(direct, direct + clean.length);
  return clean;
}
