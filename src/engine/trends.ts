/**
 * Trend + pattern layer.
 *
 * The engine above reads one entry. This file reads a *person over time*:
 * weekly averages, slope, streaks, and the handful of patterns that a careful
 * friend would notice. Every pattern carries its evidence so we never say
 * "we are worried about you" without being able to point at why.
 */

import type { CheckIn, JournalEntry, MoodBand } from './types';
import { addDays, dayKey, startOfDay } from './id';
import { SCALES, bandFor } from './checkins';

export interface DayPoint {
  date: string;
  label: string;
  mood: number | null;
  entries: number;
  distress: number | null;
  risk: 'none' | 'watch' | 'elevated' | 'urgent';
  checkin?: { scale: string; score: number };
}

export type PatternTone = 'good' | 'info' | 'notice' | 'concern';

export interface Pattern {
  id: string;
  tone: PatternTone;
  title: string;
  detail: string;
  action?: string;
  evidence: string[];
}

const RISK_WEIGHT = { none: 0, watch: 1, elevated: 2, urgent: 3 } as const;

function entriesBetween(entries: JournalEntry[], from: Date, to: Date): JournalEntry[] {
  return entries.filter((e) => {
    const t = new Date(e.createdAt).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

export function buildSeries(
  entries: JournalEntry[],
  checkins: CheckIn[],
  days = 14,
  now = new Date(),
): DayPoint[] {
  const today = startOfDay(now);
  const points: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const key = dayKey(date);
    const dayEntries = entries.filter((e) => dayKey(e.createdAt) === key);
    const dayCheckin = checkins.find((c) => dayKey(c.createdAt) === key);
    const moods = dayEntries.map((e) => e.analysis.moodScore);
    const distress = dayEntries.map((e) => e.analysis.distress);
    const risk = dayEntries.reduce<'none' | 'watch' | 'elevated' | 'urgent'>((acc, e) => {
      return RISK_WEIGHT[e.analysis.risk.level] > RISK_WEIGHT[acc] ? e.analysis.risk.level : acc;
    }, 'none');

    points.push({
      date: key,
      label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date),
      mood: moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : null,
      entries: dayEntries.length,
      distress: distress.length ? Math.round(distress.reduce((a, b) => a + b, 0) / distress.length) : null,
      risk,
      checkin: dayCheckin ? { scale: dayCheckin.scale, score: dayCheckin.score } : undefined,
    });
  }
  return points;
}

export function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function weeklyAverages(entries: JournalEntry[], now = new Date()) {
  const thisWeekStart = addDays(startOfDay(now), -6);
  const lastWeekStart = addDays(startOfDay(now), -13);
  const thisWeek = entriesBetween(entries, thisWeekStart, addDays(startOfDay(now), 1));
  const lastWeek = entriesBetween(entries, lastWeekStart, thisWeekStart);
  const thisAvg = average(thisWeek.map((e) => e.analysis.moodScore));
  const lastAvg = average(lastWeek.map((e) => e.analysis.moodScore));
  const thisDistress = average(thisWeek.map((e) => e.analysis.distress));
  const lastDistress = average(lastWeek.map((e) => e.analysis.distress));
  return {
    thisWeek: thisAvg === null ? null : Math.round(thisAvg),
    lastWeek: lastAvg === null ? null : Math.round(lastAvg),
    delta: thisAvg !== null && lastAvg !== null ? Math.round(thisAvg - lastAvg) : null,
    thisDistress: thisDistress === null ? null : Math.round(thisDistress),
    lastDistress: lastDistress === null ? null : Math.round(lastDistress),
    thisCount: thisWeek.length,
    lastCount: lastWeek.length,
  };
}

export function streak(entries: JournalEntry[], now = new Date()): number {
  const written = new Set(entries.map((e) => dayKey(e.createdAt)));
  let count = 0;
  for (let i = 0; i < 400; i += 1) {
    const key = dayKey(addDays(startOfDay(now), -i));
    if (written.has(key)) count += 1;
    else if (i === 0) continue; // today may simply not be written yet
    else break;
  }
  return count;
}

export function emotionDistribution(entries: JournalEntry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    for (const emotion of entry.analysis.emotions) {
      totals.set(emotion.label, (totals.get(emotion.label) ?? 0) + emotion.score);
    }
  }
  return Array.from(totals.entries())
    .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
}

function hasMarker(entry: JournalEntry, category: string): boolean {
  return entry.analysis.signals.some((s) => s.category === category);
}

function recent(entries: JournalEntry[], days: number, now: Date): JournalEntry[] {
  const from = addDays(startOfDay(now), -(days - 1));
  return entriesBetween(entries, from, addDays(startOfDay(now), 1));
}

export function detectPatterns(
  entries: JournalEntry[],
  checkins: CheckIn[],
  now = new Date(),
): Pattern[] {
  const patterns: Pattern[] = [];
  const week = recent(entries, 7, now);
  const prevWeek = entriesBetween(entries, addDays(startOfDay(now), -13), addDays(startOfDay(now), -6));
  const tenDays = recent(entries, 10, now);
  const weekAvg = average(week.map((e) => e.analysis.moodScore));
  const prevAvg = average(prevWeek.map((e) => e.analysis.moodScore));

  const latestCheckins = [...checkins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  /* --- Safety-first patterns ------------------------------------- */
  const flaggedCheckin = latestCheckins.find(
    (c) => c.safetyFlag && new Date(c.createdAt).getTime() >= addDays(startOfDay(now), -14).getTime(),
  );
  if (flaggedCheckin) {
    patterns.push({
      id: 'checkin-safety-flag',
      tone: 'concern',
      title: 'Your last PHQ-9 flagged question 9',
      detail:
        'You answered above zero to thoughts of being better off dead or hurting yourself. That answer matters more than the total score, and it deserves a real conversation with someone trained to help.',
      action: 'Open the support card',
      evidence: [`PHQ-9 item 9 = ${flaggedCheckin.item9}`, new Date(flaggedCheckin.createdAt).toLocaleDateString('en-GB')],
    });
  }

  const recentRisk = recent(entries, 7, now).filter(
    (e) => e.analysis.risk.level === 'urgent' || e.analysis.risk.level === 'elevated',
  );
  if (recentRisk.length > 0) {
    patterns.push({
      id: 'recent-risk-language',
      tone: 'concern',
      title: `${recentRisk.length} ${recentRisk.length === 1 ? 'entry' : 'entries'} carried risk language`,
      detail:
        'Words about not wanting to be here showed up in your writing this week. Even when the rest of the day was ordinary, this is the kind of thing worth saying out loud to a person.',
      action: 'Make a safety plan',
      evidence: recentRisk.slice(0, 3).map((e) => new Date(e.createdAt).toLocaleDateString('en-GB')),
    });
  }

  /* --- Sustained low mood ---------------------------------------- */
  const lowDays = week.filter((e) => e.analysis.moodScore < 40);
  if (lowDays.length >= 3 && week.length >= 3) {
    patterns.push({
      id: 'sustained-low',
      tone: 'concern',
      title: `Low mood on ${lowDays.length} of your last ${week.length} entries`,
      detail:
        'One hard day is a day. Three or more in a week is a pattern — the kind this app exists to catch early, while it is still easier to act on.',
      action: 'Try the PHQ-9 check-in',
      evidence: lowDays.slice(0, 4).map((e) => new Date(e.createdAt).toLocaleDateString('en-GB')),
    });
  }

  /* --- Direction of travel --------------------------------------- */
  if (weekAvg !== null && prevAvg !== null) {
    const delta = Math.round(weekAvg - prevAvg);
    if (delta <= -10) {
      patterns.push({
        id: 'mood-dropping',
        tone: 'notice',
        title: `Mood is down ${Math.abs(delta)} points from last week`,
        detail: `Your entries averaged ${Math.round(prevAvg)} last week and ${Math.round(weekAvg)} this week. A slide, not yet a collapse — worth a gentle intervention now.`,
        action: 'Read the coping suggestions',
        evidence: [`this week ${Math.round(weekAvg)}`, `last week ${Math.round(prevAvg)}`],
      });
    } else if (delta >= 10) {
      patterns.push({
        id: 'mood-rising',
        tone: 'good',
        title: `Mood is up ${delta} points from last week`,
        detail: `You moved from ${Math.round(prevAvg)} to ${Math.round(weekAvg)}. Whatever you changed this week, it is worth noticing — and repeating.`,
        evidence: [`this week ${Math.round(weekAvg)}`, `last week ${Math.round(prevAvg)}`],
      });
    }
  }

  /* --- Anxiety and sleep ----------------------------------------- */
  const anxiousCount = tenDays.filter((e) => e.analysis.emotions.some((em) => em.label === 'anxiety' && em.score >= 0.4)).length;
  const anxiousPrev = entriesBetween(entries, addDays(startOfDay(now), -20), addDays(startOfDay(now), -10)).filter(
    (e) => e.analysis.emotions.some((em) => em.label === 'anxiety' && em.score >= 0.4),
  ).length;
  if (anxiousCount >= 3 && anxiousCount > anxiousPrev) {
    patterns.push({
      id: 'rising-anxiety',
      tone: 'notice',
      title: 'Anxiety is appearing more often',
      detail: `It showed up in ${anxiousCount} of your last ${tenDays.length} entries, up from ${anxiousPrev} in the ten days before. Anxiety that grows tends to shrink sleep first.`,
      action: 'Open the breathing exercise',
      evidence: [`${anxiousCount} entries`, 'last 10 days'],
    });
  }

  const sleepCount = tenDays.filter((e) => hasMarker(e, 'sleep')).length;
  if (sleepCount >= 3) {
    patterns.push({
      id: 'sleep-disruption',
      tone: 'notice',
      title: 'Sleep keeps coming up',
      detail: `You mentioned sleep trouble in ${sleepCount} entries over ten days. Sleep is usually the first domino — protecting it protects everything else.`,
      action: 'Read the sleep steps',
      evidence: [`${sleepCount} entries`, 'last 10 days'],
    });
  }

  const withdrawn = tenDays.filter((e) => hasMarker(e, 'isolation')).length;
  if (withdrawn >= 3) {
    patterns.push({
      id: 'withdrawal',
      tone: 'notice',
      title: 'Withdrawal language in several entries',
      detail:
        'You are describing yourself pulling away from people — staying in your room, not replying, going quiet. In Ghana, going quiet is often read as respect. Here we read it as signal.',
      action: 'Name one person you can message',
      evidence: [`${withdrawn} entries`, 'last 10 days'],
    });
  }

  const shameCount = tenDays.filter((e) => hasMarker(e, 'shame')).length;
  if (shameCount >= 2) {
    patterns.push({
      id: 'shame-language',
      tone: 'info',
      title: 'Stigma is showing up in your writing',
      detail: `Worry about being judged or seen as "mad" appeared in ${shameCount} entries. Stigma is a heavier load than the symptom itself for many people here — it is not a personal failing.`,
      evidence: [`${shameCount} entries`, 'last 10 days'],
    });
  }

  /* --- Check-in movement ----------------------------------------- */
  const phq = latestCheckins.filter((c) => c.scale === 'PHQ9');
  if (phq.length >= 2) {
    const latest = phq[0];
    const previous = phq[1];
    if (latest.score - previous.score >= 5) {
      patterns.push({
        id: 'phq-worsening',
        tone: 'notice',
        title: `PHQ-9 rose ${latest.score - previous.score} points since your last check-in`,
        detail: `You moved from ${previous.band} (${previous.score}) to ${latest.band} (${latest.score}). Movement of five points or more is considered a real change, not noise.`,
        action: 'Book a clinical conversation',
        evidence: [`${previous.score} → ${latest.score}`],
      });
    } else if (previous.score - latest.score >= 5) {
      patterns.push({
        id: 'phq-improving',
        tone: 'good',
        title: `PHQ-9 dropped ${previous.score - latest.score} points`,
        detail: `From ${previous.band} (${previous.score}) to ${latest.band} (${latest.score}). That is a clinically meaningful improvement — give yourself credit for it.`,
        evidence: [`${previous.score} → ${latest.score}`],
      });
    }
  }
  const gad = latestCheckins.filter((c) => c.scale === 'GAD7');
  if (gad.length && gad[0].score >= 10) {
    patterns.push({
      id: 'gad-elevated',
      tone: 'notice',
      title: `GAD-7 in the ${gad[0].band.toLowerCase()} range`,
      detail: `Your last anxiety check-in scored ${gad[0].score} of 21. ${bandFor(SCALES.GAD7, gad[0].score).advice}`,
      action: 'See support options',
      evidence: [`GAD-7 ${gad[0].score}/21`],
    });
  }

  /* --- The silence itself ---------------------------------------- */
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  if (sorted.length > 0) {
    const gapDays = Math.floor(
      (startOfDay(now).getTime() - startOfDay(sorted[0].createdAt).getTime()) / 86_400_000,
    );
    if (gapDays >= 3 && prevAvg !== null && prevAvg < 48) {
      patterns.push({
        id: 'journaling-gap',
        tone: 'notice',
        title: `${gapDays} days without writing`,
        detail:
          'You went quiet right after a low week. Silence is not proof of anything — but in this app, it is the most common shape a hard patch takes. One line is enough.',
        action: 'Write one line',
        evidence: [`last entry ${gapDays} days ago`],
      });
    }
  }

  /* --- What is working ------------------------------------------- */
  if (week.length >= 4) {
    patterns.push({
      id: 'consistency',
      tone: 'good',
      title: `${week.length} entries this week`,
      detail: 'Showing up is the intervention. People who write most days spot their own patterns faster than any model can spot them for them.',
      evidence: [`streak ${streak(entries, now)} days`],
    });
  }
  const supportCount = week.filter((e) => hasMarker(e, 'support')).length;
  if (supportCount >= 2) {
    patterns.push({
      id: 'support-present',
      tone: 'good',
      title: 'You are naming people who help',
      detail: `Support showed up in ${supportCount} entries this week — a sister, a friend, a pastor, someone who listened. Write their names into your safety plan while it is fresh.`,
      action: 'Open safety plan',
      evidence: [`${supportCount} entries`],
    });
  }

  const order: Record<PatternTone, number> = { concern: 0, notice: 1, info: 2, good: 3 };
  return patterns.sort((a, b) => order[a.tone] - order[b.tone]);
}

export function concernScore(patterns: Pattern[]): number {
  return patterns.reduce((acc, p) => {
    if (p.tone === 'concern') return acc + 2;
    if (p.tone === 'notice') return acc + 1;
    return acc;
  }, 0);
}

export function trendHeadline(entries: JournalEntry[], now = new Date()): string {
  const { thisWeek, lastWeek, delta } = weeklyAverages(entries, now);
  if (thisWeek === null) return 'No entries yet this week.';
  if (lastWeek === null) return `This week averages ${thisWeek}/100.`;
  if (delta === null) return `This week averages ${thisWeek}/100.`;
  if (delta >= 6) return `Up ${delta} points on last week — a real shift.`;
  if (delta <= -6) return `Down ${Math.abs(delta)} points on last week.`;
  return 'Broadly level with last week.';
}

export function bandSummary(points: DayPoint[]): { band: MoodBand; label: string } {
  const values = points.map((p) => p.mood).filter((v): v is number => v !== null);
  const avg = average(values) ?? 58;
  if (avg >= 72) return { band: 'bright', label: 'Bright stretch' };
  if (avg >= 55) return { band: 'steady', label: 'Steady stretch' };
  if (avg >= 35) return { band: 'unsettled', label: 'Unsettled stretch' };
  return { band: 'heavy', label: 'Heavy stretch' };
}
