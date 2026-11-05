/**
 * The reading engine.
 *
 * Pipeline (each step is pure and inspectable):
 *   normalise → valence (VADER-style rules) → marker groups → risk scan
 *   → distress index → emotion distribution → confidence → signals
 *
 * Design constraints:
 *  - deterministic: identical text always yields an identical reading;
 *  - explainable: every point of the reading can be traced to a phrase;
 *  - conservative on safety: any explicit risk language escalates even when
 *    the overall sentiment is positive ("I smiled today but I want to die").
 */

import {
  DEATH_CUES,
  DIMINISHERS,
  EMOTION_LEXICON,
  FINALITY_CUES,
  INTENT_CUES,
  PLANNING_CUES,
  FIRST_PERSON,
  INTENSIFIERS,
  LEXICON_VERSION,
  MARKER_GROUPS,
  NEGATION_EMPHASIS,
  NEGATORS,
  PHRASES,
  RISK_PATTERNS,
  RISK_SUPPRESSIONS,
  THIRD_PERSON_CUES,
  VALENCE,
} from './lexicon';
import { GHANAIAN_MARKERS, locatePhrase, prepare } from './normalize';
import type {
  Analysis,
  EmotionLabel,
  EmotionScore,
  MoodBand,
  RiskFinding,
  RiskLevel,
  RiskMatch,
  Signal,
  SignalCategory,
} from './types';

export const ENGINE_VERSION = 'nkommo-engine-1.0.0';
export const LEXICON_TAG = LEXICON_VERSION;

const RISK_ORDER: Record<RiskLevel, number> = { none: 0, watch: 1, elevated: 2, urgent: 3 };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function sign(n: number): number {
  return n < 0 ? -1 : 1;
}

function moodBandFor(score: number): MoodBand {
  if (score >= 76) return 'bright';
  if (score >= 52) return 'steady';
  if (score >= 30) return 'unsettled';
  return 'heavy';
}

/* ------------------------------------------------------------------ */
/* Risk                                                                */
/* ------------------------------------------------------------------ */

function scanRisk(text: string): RiskFinding {
  const kept: RiskMatch[] = [];
  const suppressedMatches: RiskMatch[] = [];
  let suppressedBy: string | undefined;

  const sentenceFor = (index: number, length: number): string => {
    const start = text.lastIndexOf('|', index) + 1;
    const endIdx = text.indexOf('|', index + length);
    return text.slice(start, endIdx === -1 ? text.length : endIdx);
  };

  for (const pattern of RISK_PATTERNS) {
    const re = new RegExp(pattern.re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const phrase = m[0].replace(/\s+/g, ' ').trim();
      if (!phrase) continue;

      // Subject attribution: first person in the clause window wins, unless
      // the phrase itself names somebody else.
      const beforeTokens = text.slice(0, m.index).split(/\s+/).filter(Boolean).slice(-8);
      const hasFirst = beforeTokens.some((t) => FIRST_PERSON.has(t));
      const hasThird = beforeTokens.some((t) => THIRD_PERSON_CUES.has(t));
      const inlineThird = /\b(my (friend|sister|brother|cousin|mate|roommate|classmate|neighbour|neighbor)|he|she|they)\b/i.test(phrase);
      const subject: RiskMatch['subject'] = inlineThird || (hasThird && !hasFirst)
        ? 'other'
        : hasFirst
          ? 'self'
          : 'unclear';

      const match: RiskMatch = { phrase, tier: pattern.tier, pattern: pattern.label, subject };

      // Sentence-level suppression: protective or figurative language cancels
      // a match inside that same sentence.
      const sentence = sentenceFor(m.index, phrase.length);
      const suppression = RISK_SUPPRESSIONS.find((sup) => sup.re.test(sentence));
      const explicitIntent = /kill myself|end my life|take my own life|want to die|hurt myself/.test(phrase);
      const protective = suppression && /do not|don't|never|not suicidal|general/i.test(suppression.note);

      if (suppression && (protective || !explicitIntent)) {
        suppressedMatches.push(match);
        suppressedBy = suppressedBy ?? suppression.note;
      } else {
        kept.push(match);
      }

      if (re.lastIndex === m.index) re.lastIndex += 1;
    }
  }

  // Composite escalation: intent cue + death cue in the same entry.
  const intentCue = INTENT_CUES.find((re) => re.test(text));
  const finalityCue = FINALITY_CUES.find((re) => re.test(text));
  const hasDeath = DEATH_CUES.some((re) => re.test(text));
  const hasPlanning = PLANNING_CUES.some((re) => re.test(text));
  const urgentAlready = kept.some((m) => m.tier === 'urgent');

  if (!urgentAlready && intentCue && hasDeath) {
    kept.push({
      phrase: text.match(intentCue)?.[0]?.trim() ?? 'intent',
      tier: 'urgent',
      pattern: 'intent expressed together with death language',
      subject: 'self',
    });
  } else if (!urgentAlready && finalityCue && (hasDeath || hasPlanning)) {
    kept.push({
      phrase: text.match(finalityCue)?.[0]?.trim() ?? 'finality language',
      tier: 'urgent',
      pattern: 'finality language (settling accounts) with plan or death language',
      subject: 'self',
    });
  }

  // Split by subject: reported speech about another person must not raise the
  // writer's own tier, but still deserves guidance.
  const selfMatches = kept.filter((m) => m.subject !== 'other');
  const otherMatches = kept.filter((m) => m.subject === 'other');

  let level: RiskLevel = 'none';
  for (const m of selfMatches) if (RISK_ORDER[m.tier] > RISK_ORDER[level]) level = m.tier;

  let score = 0;
  for (const m of selfMatches) {
    const pattern = RISK_PATTERNS.find((p) => p.label === m.pattern);
    score = Math.max(score, pattern?.severity ?? 55);
  }

  // Rehearsal + ideation: "thinking about how I would do it" is planning even
  // when the writer never uses the word plan. Escalate, never de-escalate.
  if (level === 'elevated' && selfMatches.length > 0 && hasPlanning) {
    level = 'urgent';
    score = Math.max(score, 90);
    kept.push({
      phrase: text.match(PLANNING_CUES[0])?.[0]?.trim() ?? 'planning language',
      tier: 'urgent',
      pattern: 'planning language alongside risk language',
      subject: 'self',
    });
  }

  if (level === 'none' && otherMatches.length) {
    level = 'watch';
    score = Math.max(score, 45);
  }

  if (level === 'none' && suppressedMatches.length) {
    // Everything risk-like was explained away. Keep a low "watch" only when
    // the writing still carries death language, so we never give a false all-clear.
    const deathMention = DEATH_CUES.some((re) => re.test(text));
    if (deathMention && /want to die|pain|hurt/.test(text)) {
      level = 'none';
    }
  }

  const allKept = [...selfMatches, ...otherMatches];

  return {
    level,
    score,
    matches: allKept.slice(0, 6),
    subject: selfMatches.length
      ? selfMatches.some((m) => m.subject === 'self') ? 'self' : 'unclear'
      : otherMatches.length
        ? 'other'
        : 'self',
    suppressed: suppressedMatches.length > 0,
    suppressedBy,
  };
}

/* ------------------------------------------------------------------ */
/* Main analysis                                                       */
/* ------------------------------------------------------------------ */

export function analyse(raw: string, when: Date = new Date()): Analysis {
  const prepared = prepare(raw);
  const { tokens, emphasis } = prepared;
  const text = ` ${prepared.text} `;

  let sum = 0;
  let recognisedTokens = 0;
  const signals: Signal[] = [];
  const emotionTotals = new Map<EmotionLabel, number>();
  const lastBut = tokens.lastIndexOf('but');

  const addEmotion = (label: EmotionLabel, weight: number) => {
    emotionTotals.set(label, (emotionTotals.get(label) ?? 0) + weight);
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token === '|') {
      i += 1;
      continue;
    }

    // Longest-match phrase lookup: 5 → 2 tokens, then unigram.
    let matchedSpan = 0;
    let base: number | undefined;
    let phraseKey = '';

    for (const size of [5, 4, 3, 2]) {
      if (i + size > tokens.length) continue;
      const slice = tokens.slice(i, i + size);
      if (slice.includes('|')) continue;
      const key = slice.join(' ');
      const value = PHRASES.get(key);
      if (value !== undefined) {
        matchedSpan = size;
        base = value;
        phraseKey = key;
        break;
      }
    }

    if (base === undefined) {
      const value = VALENCE.get(token);
      if (value !== undefined) {
        matchedSpan = 1;
        base = value;
        phraseKey = token;
      }
    }

    if (base === undefined || matchedSpan === 0) {
      i += 1;
      continue;
    }

    recognisedTokens += matchedSpan;

    let valence = base;
    const clauseStart = tokens.lastIndexOf('|', i);
    const windowStart = Math.max(clauseStart + 1, i - 3);
    const window = tokens.slice(windowStart, i);

    // Negation: VADER flips by -0.74 (compounded for stacked negators).
    let negations = 0;
    for (const w of window) {
      if (NEGATORS.has(w)) negations += 1;
      else if (NEGATION_EMPHASIS.has(w)) continue;
    }
    if (negations > 0) {
      valence *= Math.pow(-0.74, negations);
      signals.push({
        phrase: phraseKey,
        category: 'negation',
        weight: valence,
        note: negations > 1 ? 'double negation softened the reading' : 'negation flipped the reading',
      });
    }

    // Intensifiers / diminishers in the two tokens before the hit.
    const lastWord = window[window.length - 1];
    const secondLast = window[window.length - 2];
    if (lastWord && INTENSIFIERS[lastWord] !== undefined) valence *= INTENSIFIERS[lastWord];
    if (lastWord && DIMINISHERS[lastWord] !== undefined) valence *= DIMINISHERS[lastWord];
    if (secondLast && INTENSIFIERS[secondLast] !== undefined) valence *= 1 + (INTENSIFIERS[secondLast] - 1) * 0.5;

    // VADER "but" rule: weight after the contrast, dampen before it.
    if (lastBut >= 0) {
      if (i > lastBut) valence *= 1.35;
      else valence *= 0.7;
    }

    // Emphasis: SHOUTED words add 0.733 in the direction of their valence.
    const spanEmphasis = emphasis.slice(i, i + matchedSpan).some(Boolean);
    if (spanEmphasis) valence += sign(valence) * 0.733;

    sum += valence;

    // Emotion attribution (negated emotions are dropped, not inverted).
    const emotionHit = (key: string, scale: number) => {
      for (const [label, dict] of Object.entries(EMOTION_LEXICON) as [EmotionLabel, Map<string, number>][]) {
        const w = dict.get(key);
        if (w !== undefined) addEmotion(label, w * scale);
      }
    };
    if (negations === 0) {
      if (matchedSpan > 1) {
        // Score each unigram inside a matched phrase, plus the phrase itself.
        for (let k = 0; k < matchedSpan; k += 1) emotionHit(tokens[i + k], 0.8);
        emotionHit(phraseKey, 1.2);
      } else {
        emotionHit(phraseKey, 1);
      }
    }

    // Confidence evidence: long phrases are stronger evidence than single words.
    const category: SignalCategory = valence >= 0 ? 'positive' : 'negative';
    if (Math.abs(valence) >= 1.4) {
      signals.push({
        phrase: locatePhrase(raw, phraseKey),
        category,
        weight: valence,
        note: matchedSpan > 1 ? 'phrase-level match' : 'single-word match',
      });
    }

    i += matchedSpan;
  }

  // Global punctuation and emoji effects.
  if (prepared.exclamations > 0 && Math.abs(sum) > 0.1) {
    sum += sign(sum) * Math.min(prepared.exclamations, 4) * 0.292;
  }
  sum += prepared.emojiValence;

  // Valence is lexicon-driven, so risk phrasing the lexicon does not carry
  // ("I have been cutting myself") can leave compound near zero. A safety
  // reading must never look cheerful, so risk puts a floor under it.
  const compound = clamp(sum / Math.sqrt(sum * sum + 15), -1, 1);

  /* ---- Marker groups ---- */
  const groupHits: Record<string, { phrase: string; count: number }> = {};
  for (const [key, group] of Object.entries(MARKER_GROUPS)) {
    let count = 0;
    let first = '';
    for (const phrase of group.phrases) {
      if (text.includes(` ${phrase} `) || text.includes(` ${phrase}`) || text.includes(`${phrase} `)) {
        count += 1;
        if (!first) first = phrase;
      }
    }
    groupHits[key] = { phrase: first, count };

    if (count > 0 && key !== 'support') {
      signals.push({
        phrase: locatePhrase(raw, first),
        category: key as SignalCategory,
        weight: -count * group.weight,
        note: group.note,
      });
      // Marker groups also nudge the emotion distribution.
      if (key === 'isolation') addEmotion('loneliness', count * 0.8);
      if (key === 'shame') addEmotion('shame', count * 0.8);
      if (key === 'hopelessness') addEmotion('sadness', count * 0.6);
      if (key === 'anxiety' || key === 'sleep') addEmotion('anxiety', count * 0.7);
      if (key === 'somatic') addEmotion('numbness', count * 0.3);
    }
    if (count > 0 && key === 'support') {
      signals.push({
        phrase: locatePhrase(raw, first),
        category: 'support',
        weight: count * 0.9,
        note: group.note,
      });
      addEmotion('hope', count * 0.5);
    }
  }

  /* ---- Risk ---- */
  const risk = scanRisk(text);
  for (const match of risk.matches.slice(0, 3)) {
    signals.push({
      phrase: match.phrase,
      category: match.tier === 'urgent' ? 'suicidal-ideation' : match.tier === 'elevated' ? 'suicidal-ideation' : 'hopelessness',
      weight: -3 - RISK_ORDER[match.tier],
      note: `risk pattern: ${match.pattern}`,
    });
  }
  if (risk.level !== 'none') {
    addEmotion('sadness', risk.score / 40);
    if (risk.level === 'urgent') addEmotion('fear', 0.6);
  }

  /* ---- Distress index ---- */
  const negativeLoad = Math.max(0, -compound) * 46;
  const distressRaw =
    6 +
    negativeLoad +
    Math.min(3, groupHits.hopelessness.count) * 9 +
    Math.min(3, groupHits.anxiety.count) * 6 +
    Math.min(3, groupHits.isolation.count) * 5 +
    Math.min(3, groupHits.shame.count) * 4 +
    Math.min(2, groupHits.sleep.count) * 4 +
    Math.min(2, groupHits.somatic.count) * 3.5 +
    Math.min(2, groupHits.impairment.count) * 5 -
    Math.min(2, groupHits.support.count) * 4;

  let distress = clamp(Math.round(Math.max(distressRaw, risk.score * 0.95)), 0, 100);
  if (risk.level === 'urgent') distress = Math.max(distress, 92);

  /* ---- Mood score ---- */
  let moodScore = Math.round(
    clamp(58 + 30 * compound - 0.32 * Math.max(0, distress - 28), 0, 100),
  );
  if (risk.level === 'urgent') moodScore = Math.min(moodScore, 12);
  else if (risk.level === 'elevated') moodScore = Math.min(moodScore, 34);
  else if (risk.level === 'watch') moodScore = Math.min(moodScore, 48);
  // Withdrawal is behavioural: "I stayed in my room and did not reply to
  // anyone" carries almost no sentiment words, so the lexicon alone calls it
  // steady. Two or more isolation phrases with no positive counterweight is
  // an unsettled day by any clinical reading.
  else if (groupHits.isolation.count >= 2 && compound <= 0.15) moodScore = Math.min(moodScore, 46);

  /* ---- Emotions ---- */
  const emotions = normaliseEmotions(emotionTotals, compound, distress);

  /* ---- Language + confidence ---- */
  const contentTokens = tokens.filter((t) => t !== '|');
  const ghanaianTokens = contentTokens.filter((t) => GHANAIAN_MARKERS.has(t));
  const markerRatio = contentTokens.length ? ghanaianTokens.length / contentTokens.length : 0;
  const coverage = contentTokens.length ? recognisedTokens / contentTokens.length : 0;

  const language = {
    ghanaianMarkerRatio: Number(markerRatio.toFixed(3)),
    markers: prepared.markerTokens.slice(0, 12),
    support:
      contentTokens.length < 4
        ? ('limited-coverage' as const)
        : markerRatio > 0.04
          ? ('english-with-ghanaian-markers' as const)
          : coverage < 0.12 && contentTokens.length > 12
            ? ('limited-coverage' as const)
            : ('english' as const),
  };

  const confidence = clamp(
    0.2 +
      0.4 * Math.min(1, prepared.wordCount / 40) +
      0.28 * Math.min(1, recognisedTokens / 8) +
      0.12 * Math.min(1, (groupHits.hopelessness.count + groupHits.isolation.count + groupHits.anxiety.count) / 2),
    0.12,
    0.98,
  );

  const dedupedSignals = dedupeSignals(signals)
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 10);

  const compoundFloored =
    risk.level === 'urgent'
      ? Math.min(compound, -0.75)
      : risk.level === 'elevated'
        ? Math.min(compound, -0.5)
        : risk.level === 'watch'
          ? Math.min(compound, -0.2)
          : compound;

  return {
    version: ENGINE_VERSION,
    text: raw,
    wordCount: prepared.wordCount,
    compound: Number(compoundFloored.toFixed(3)),
    moodScore,
    moodBand: moodBandFor(moodScore),
    distress,
    emotions,
    risk: {
      ...risk,
      level: risk.level === 'none' && risk.suppressed ? 'none' : risk.level,
    },
    signals: dedupedSignals,
    language,
    confidence: Number(
      (risk.level === 'urgent' || risk.level === 'elevated'
        ? Math.max(confidence, 0.82)
        : confidence
      ).toFixed(2),
    ),
    analysedAt: when.toISOString(),
  };
}

function normaliseEmotions(
  totals: Map<EmotionLabel, number>,
  compound: number,
  distress: number,
): EmotionScore[] {
  const entries = Array.from(totals.entries()).filter(([, v]) => v > 0.05);
  if (entries.length === 0) {
    if (compound > 0.15) return [{ label: 'calm', score: 1 }];
    if (compound < -0.15 || distress > 45) return [{ label: 'numbness', score: 1 }];
    return [{ label: 'calm', score: 0.6 }, { label: 'numbness', score: 0.4 }];
  }
  const max = Math.max(...entries.map(([, v]) => v));
  return entries
    .map(([label, v]) => ({ label, score: Number((v / max).toFixed(2)) }))
    .filter((e) => e.score >= 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function dedupeSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>();
  const out: Signal[] = [];
  for (const s of signals) {
    const key = `${s.category}:${s.phrase.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

export const MOOD_BAND_COPY: Record<MoodBand, { label: string; blurb: string }> = {
  bright: { label: 'Bright', blurb: 'There is some light in this entry.' },
  steady: { label: 'Steady', blurb: 'An ordinary day, holding its shape.' },
  unsettled: { label: 'Unsettled', blurb: 'Something is pressing on you today.' },
  heavy: { label: 'Heavy', blurb: 'This one sounds like it cost you something.' },
};

export const RISK_LEVEL_COPY: Record<RiskLevel, { label: string; blurb: string }> = {
  none: { label: 'No safety signal', blurb: 'Nothing in this entry points to risk.' },
  watch: { label: 'Worth watching', blurb: 'Some hopeless language. Keep an eye on the next few days.' },
  elevated: { label: 'Elevated concern', blurb: 'Language that suggests you may be thinking about not being here. Please read the support card.' },
  urgent: { label: 'Urgent — please read now', blurb: 'Words that suggest you may be at risk right now. You deserve immediate human support.' },
};

export function summarise(analysis: Analysis): string {
  const top = analysis.emotions[0]?.label ?? 'calm';
  return `${MOOD_BAND_COPY[analysis.moodBand].label} · mostly ${top} · distress ${analysis.distress}/100`;
}
