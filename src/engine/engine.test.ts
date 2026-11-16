import { describe, expect, it } from 'vitest';
import { analyse } from './analyze';
import { EVAL_CORPUS } from './eval/corpus';
import { createCheckIn, bandFor, SCALES } from './checkins';
import {
  buildSeries,
  concernScore,
  detectPatterns,
  emotionDistribution,
  streak,
  trendHeadline,
  weeklyAverages,
} from './trends';
import type { JournalEntry } from './types';

const entry = (text: string, daysAgo = 0): JournalEntry => {
  const when = new Date();
  when.setDate(when.getDate() - daysAgo);
  return {
    id: `e-${daysAgo}-${text.slice(0, 8)}`,
    createdAt: when.toISOString(),
    text,
    source: 'typed',
    analysis: analyse(text, when),
  };
};

describe('risk detection — safety critical', () => {
  it('flags explicit intent as urgent', () => {
    const result = analyse('I want to die. I cannot do this anymore.');
    expect(result.risk.level).toBe('urgent');
  });

  it('flags farewell / planning language as urgent', () => {
    const result = analyse(
      'I have decided. I have a plan and I have what I need. I am writing this so someone knows it was not their fault.',
    );
    expect(result.risk.level).toBe('urgent');
  });

  it('flags Pidgin intent as urgent', () => {
    const result = analyse('I don tire. I go kill myself tonight, I no want anybody to suffer.');
    expect(result.risk.level).toBe('urgent');
  });

  it('does not flag idioms as risk', () => {
    for (const text of [
      'I am dying to see my sister this weekend.',
      'This jollof is to die for.',
      'I killed it at work today.',
      'When I die I want to be buried in my hometown.',
      'My friend told me he wants to die and I am worried about him.',
    ]) {
      const result = analyse(text);
      expect(result.risk.level, text).not.toBe('urgent');
    }
  });

  it('treats third-party risk separately from the writer', () => {
    const result = analyse('My cousin said there is no reason to live and I do not know what to do.');
    expect(result.risk.subject).toBe('other');
    expect(result.risk.level).toBe('watch');
  });

  it('suppresses protective declarations but says so', () => {
    const result = analyse('I have never been suicidal. I am just stressed about money like everyone else.');
    expect(result.risk.level).toBe('none');
    expect(result.risk.suppressed).toBe(true);
  });

  it('never lets a positive day cancel risk language', () => {
    const result = analyse('I laughed with my friends today but I still want to die.');
    expect(result.risk.level).toBe('urgent');
  });

  it('keeps "none" distinct from "safe" in copy', () => {
    const result = analyse('An ordinary day. Class, lunch, football. I am okay.');
    expect(result.risk.level).toBe('none');
    expect(result.moodScore).toBeGreaterThan(40);
  });
});

describe('valence and emotion', () => {
  it('reads negation', () => {
    const positive = analyse('I am happy today.');
    const negated = analyse('I am not happy today.');
    expect(positive.compound).toBeGreaterThan(0);
    expect(negated.compound).toBeLessThan(positive.compound);
  });

  it('reads Ghanaian Pidgin positively', () => {
    const result = analyse('Chale I dey try. My shop made small profit today, medaase God. E go better.');
    expect(result.compound).toBeGreaterThan(0);
    expect(result.language.markers.length).toBeGreaterThan(0);
  });

  it('identifies anxiety language', () => {
    const result = analyse(
      'I am so stressed about my exams. I cannot sleep, my heart beats fast when I open the past questions and I keep overthinking.',
    );
    expect(result.emotions.map((e) => e.label)).toContain('anxiety');
    expect(result.distress).toBeGreaterThan(35);
  });

  it('scores a heavy entry as heavy, with a high distress load', () => {
    const result = analyse(
      'I feel empty and worthless. I cannot get out of bed, I missed lectures and I am ashamed to tell my parents. Nothing matters anymore.',
    );
    expect(result.moodBand).toBe('heavy');
    expect(result.distress).toBeGreaterThanOrEqual(50);
  });

  it('is deterministic for the same clock time', () => {
    const text = 'I am tired but I am trying. Small wins today.';
    const at = new Date('2026-03-01T20:00:00Z');
    expect(JSON.stringify(analyse(text, at))).toBe(JSON.stringify(analyse(text, at)));
  });

  it('handles empty and whitespace input without throwing', () => {
    expect(() => analyse('')).not.toThrow();
    expect(analyse('   ').wordCount).toBe(0);
    expect(analyse('').risk.level).toBe('none');
  });

  it('produces explainable signals that were present in the text', () => {
    const text = 'I feel hopeless and alone. Nobody understands me and I keep crying.';
    const result = analyse(text);
    expect(result.signals.length).toBeGreaterThan(0);
    for (const signal of result.signals) {
      expect(signal.phrase.length).toBeGreaterThan(0);
      expect(signal.category).toBeTruthy();
    }
  });

  it('reports low coverage for non-English text instead of guessing', () => {
    const result = analyse('Me ho yɛ me ya paa. Me kɔn dɔ me, nanso obiara nte aseɛ.');
    expect(['limited-coverage', 'english-with-ghanaian-markers']).toContain(result.language.support);
    expect(result.language.support).toBe('limited-coverage');
  });
});

describe('evaluation corpus', () => {
  it('is balanced enough to be meaningful', () => {
    expect(EVAL_CORPUS.length).toBeGreaterThanOrEqual(60);
    expect(EVAL_CORPUS.filter((c) => c.split === 'test').length).toBeGreaterThanOrEqual(25);
    expect(EVAL_CORPUS.filter((c) => c.context === 'gh').length).toBeGreaterThanOrEqual(10);
  });

  it('catches every urgent case in the held-out split', () => {
    const urgent = EVAL_CORPUS.filter((c) => c.split === 'test' && c.risk === 'urgent');
    for (const item of urgent) {
      expect(analyse(item.text).risk.level, item.id).toBe('urgent');
    }
  });
});

describe('PHQ-9 and GAD-7', () => {
  it('sums scores and assigns the right band', () => {
    const checkin = createCheckIn('PHQ9', [1, 1, 1, 1, 1, 1, 1, 0, 0]);
    expect(checkin.score).toBe(7);
    expect(checkin.band).toBe('Mild');
  });

  it('flags item 9 at any level above zero, regardless of total', () => {
    const checkin = createCheckIn('PHQ9', [0, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(checkin.score).toBe(1);
    expect(checkin.item9).toBe(1);
    expect(checkin.safetyFlag).toBe(true);
  });

  it('does not flag item 9 when zero', () => {
    const checkin = createCheckIn('PHQ9', [3, 3, 3, 2, 2, 2, 1, 1, 0]);
    expect(checkin.safetyFlag).toBe(false);
    expect(checkin.band).toBe('Moderately severe'); // 17 points
  });

  it('clamps out-of-range answers and bands GAD-7 correctly', () => {
    const checkin = createCheckIn('GAD7', [9, -3, 2, 2, 2, 2, 2]);
    expect(checkin.answers.every((a) => a >= 0 && a <= 3)).toBe(true);
    expect(checkin.score).toBe(13);
    expect(checkin.band).toBe('Moderate');
    expect(bandFor(SCALES.GAD7, 0).label).toBe('Minimal');
  });
});

describe('trend and pattern layer', () => {
  const entries = [
    entry('I feel empty and worthless. Nothing matters and I cannot sleep.', 1),
    entry('I stayed in my room all day and did not reply to anyone. I feel alone and nobody understands.', 3),
    entry('Still tired. I could not sleep, I have not eaten and I have been avoiding my friends. Everything feels pointless.', 5),
    entry('I am worried about money, my chest feels tight. I have been avoiding people.', 8),
    entry('A better day. I walked and I ate properly.', 9),
  ];

  it('builds a daily series with gaps preserved', () => {
    const series = buildSeries(entries, [], 14);
    expect(series).toHaveLength(14);
    expect(series.some((p) => p.mood === null)).toBe(true);
  });

  it('computes weekly averages and a direction', () => {
    const week = weeklyAverages(entries);
    expect(week.thisWeek).not.toBeNull();
    expect(typeof trendHeadline(entries)).toBe('string');
  });

  it('detects sustained low mood and withdrawal with evidence', () => {
    const patterns = detectPatterns(entries, []);
    const ids = patterns.map((p) => p.id);
    expect(ids).toContain('sustained-low');
    expect(ids).toContain('withdrawal');
    expect(concernScore(patterns)).toBeGreaterThan(0);
    for (const pattern of patterns) {
      expect(pattern.evidence.length).toBeGreaterThan(0);
    }
  });

  it('counts streaks without breaking on an unwritten today', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const e: JournalEntry = {
      id: 'x',
      createdAt: yesterday.toISOString(),
      text: 'okay',
      source: 'typed',
      analysis: analyse('okay', yesterday),
    };
    expect(streak([e])).toBeGreaterThanOrEqual(1);
  });

  it('lets the writer overwrite the model in the series', () => {
    const corrected = entry('An ordinary day. Nothing much happened.', 0);
    corrected.feltMood = 'bright';
    const points = buildSeries([corrected], [], 1);
    expect(points[0].mood).toBe(85);
    expect(weeklyAverages([corrected]).thisWeek).toBe(85);
  });

  it('never reports a neutral compound on a high-risk reading', () => {
    const selfHarm = analyse('I have been cutting myself again. I do not want to be here anymore.');
    expect(selfHarm.risk.level).toBe('urgent');
    expect(selfHarm.compound).toBeLessThanOrEqual(-0.75);
    expect(selfHarm.moodScore).toBeLessThanOrEqual(12);
  });

  it('keeps a friend’s risk out of the writer’s own level but still records it', () => {
    const friend = analyse("My friend told me he wants to kill himself and I don't know what to do.");
    expect(friend.risk.subject).toBe('other');
    expect(friend.risk.level).toBe('watch');
    expect(friend.risk.matches.some((match) => match.subject === 'other')).toBe(true);
  });

  it('aggregates emotions', () => {
    const distribution = emotionDistribution(entries);
    expect(distribution.length).toBeGreaterThan(0);
    expect(distribution[0].value).toBeGreaterThan(0);
  });

  it('raises a concern when a check-in flags item 9', () => {
    const checkin = createCheckIn('PHQ9', [2, 2, 2, 1, 1, 2, 1, 0, 2]);
    const patterns = detectPatterns(entries, [checkin]);
    expect(patterns.map((p) => p.id)).toContain('checkin-safety-flag');
    expect(patterns[0].tone).toBe('concern');
  });
});
