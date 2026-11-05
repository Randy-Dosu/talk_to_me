import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowUpRight, BellRing, CheckCircle2, ClipboardList, Info, TrendingDown, TrendingUp } from 'lucide-react';
import MoodChart from '../components/MoodChart';
import { EmptyState, SectionHeading } from '../components/ui';
import { useStore } from '../data/store';
import { addDays, formatDay, startOfDay } from '../engine/id';
import {
  bandSummary,
  buildSeries,
  concernScore,
  detectPatterns,
  emotionDistribution,
  streak,
  trendHeadline,
  weeklyAverages,
  type Pattern,
} from '../engine/trends';
import { EMOTION_META } from '../lib/tone';

const TONE_STYLES: Record<Pattern['tone'], { wrapper: string; dot: string; label: string }> = {
  concern: { wrapper: 'border-rose/30 bg-rose/5', dot: 'bg-rose', label: 'Concern' },
  notice: { wrapper: 'border-gold/30 bg-gold/6', dot: 'bg-gold', label: 'Notice' },
  info: { wrapper: 'border-line bg-white/60', dot: 'bg-sky', label: 'Context' },
  good: { wrapper: 'border-sage/30 bg-sage/6', dot: 'bg-sage', label: 'Working' },
};

const ACTION_LINKS: Record<string, string> = {
  'Open the support card': '/safety',
  'Make a safety plan': '/safety#plan',
  'Try the PHQ-9 check-in': '/check-in',
  'Read the coping suggestions': '/safety#coping',
  'Open the breathing exercise': '/safety#breathe',
  'Read the sleep steps': '/safety#coping',
  'Name one person you can message': '/trusted',
  'Book a clinical conversation': '/safety#resources',
  'See support options': '/safety#resources',
  'Open safety plan': '/safety#plan',
  'Write one line': '/journal',
};

export default function Trends() {
  const { state } = useStore();
  const [windowDays, setWindowDays] = useState<14 | 30>(14);

  const entries = state.entries;
  const points = useMemo(() => buildSeries(entries, state.checkins, windowDays), [entries, state.checkins, windowDays]);
  const patterns = useMemo(() => detectPatterns(entries, state.checkins), [entries, state.checkins]);
  const week = weeklyAverages(entries);
  const distribution = useMemo(() => emotionDistribution(entries.slice(0, 40)), [entries]);
  const summary = bandSummary(points);
  const concerns = concernScore(patterns);
  const checkins = [...state.checkins].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const readingDays = points.filter((p) => p.mood !== null).length;
  const riskyDays = points.filter((p) => p.risk === 'urgent' || p.risk === 'elevated').length;
  const trusted = state.settings.trusted;
  const eligibleForAlert = concerns >= 3 && Boolean(trusted?.enabled);

  if (entries.length === 0) {
    return (
      <div className="container-page py-12">
        <SectionHeading
          eyebrow="Patterns"
          title="The pattern needs a little history."
          blurb="Write a few entries and this page becomes the most useful thing in the app: what is changing, and how fast."
        />
        <div className="mt-8">
          <EmptyState
            icon={<TrendingUp size={18} />}
            title="No entries yet"
            body="Two or three entries across a week is enough to see direction of travel. Load the sample if you want to see the shape of it first."
            action={
              <Link to="/journal" className="btn btn-primary text-[0.82rem]">Write the first entry</Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Patterns · last {windowDays} days</p>
          <h1 className="mt-2 text-balance font-display text-[2rem] leading-tight text-ink md:text-[2.4rem]">
            {trendHeadline(entries)}
          </h1>
          <p className="mt-2 max-w-xl text-[0.9rem] leading-relaxed text-ink-muted">
            {summary.label} with {readingDays} {readingDays === 1 ? 'day of readings' : 'days of readings'}.
            {riskyDays > 0
              ? ` ${riskyDays} ${riskyDays === 1 ? 'day carried' : 'days carried'} risk language.`
              : ' No risk language in this window.'}
          </p>
        </div>
        <div className="flex rounded-full border border-line bg-white/60 p-1">
          {[14, 30].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setWindowDays(days as 14 | 30)}
              className={clsx(
                'rounded-full px-3 py-1.5 text-[0.78rem] transition-colors',
                windowDays === days ? 'bg-forest text-paper' : 'text-ink-muted hover:text-ink',
              )}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'This week', value: week.thisWeek ?? '—', suffix: '/100', icon: TrendingUp, note: week.delta === null ? 'first readings' : `${week.delta >= 0 ? '+' : ''}${week.delta} vs last week` },
          { label: 'Last week', value: week.lastWeek ?? '—', suffix: '/100', icon: TrendingDown, note: `${week.lastCount} entries` },
          { label: 'Streak', value: streak(entries), suffix: ' days', icon: CheckCircle2, note: 'consecutive writing days' },
          { label: 'Check-ins', value: checkins.length, suffix: '', icon: ClipboardList, note: checkins[0] ? `latest ${checkins[0].score}/${checkins[0].maxScore}` : 'none yet' },
        ].map((card) => (
          <div key={card.label} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-muted">{card.label}</p>
              <card.icon size={14} className="text-ink-muted" />
            </div>
            <p className="mt-2 font-display text-[1.8rem] leading-none text-forest">
              {card.value}
              <span className="text-[0.72rem] font-normal text-ink-muted">{card.suffix}</span>
            </p>
            <p className="mt-1.5 text-[0.7rem] text-ink-muted">{card.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Mood over time</p>
              <p className="mt-1 text-[0.78rem] text-ink-muted">Dashed lines mark the steady (52) and unsettled (30) boundaries.</p>
            </div>
            <span className="hidden rounded-full bg-paper-deep px-2 py-1 text-[0.66rem] text-ink-muted sm:block">0 = worst · 100 = best</span>
          </div>
          <div className="mt-4">
            <MoodChart points={points} height={260} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <p className="eyebrow">Emotional signature</p>
            <p className="mt-1 text-[0.74rem] text-ink-muted">Across your {Math.min(40, entries.length)} most recent entries.</p>
            <div className="mt-3 space-y-2">
              {distribution.slice(0, 6).map((emotion) => {
                const meta = EMOTION_META[emotion.label as keyof typeof EMOTION_META];
                const max = distribution[0]?.value || 1;
                return (
                  <div key={emotion.label} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[0.72rem] text-ink-soft">{meta?.label ?? emotion.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/6">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${Math.max(6, (emotion.value / max) * 100)}%`, backgroundColor: meta?.hex ?? '#6F8F74' }}
                      />
                    </span>
                  </div>
                );
              })}
              {distribution.length === 0 && <p className="text-[0.78rem] text-ink-muted">No emotion signal yet.</p>}
            </div>
          </div>

          {trusted?.enabled && (
            <div className={clsx('rounded-2xl border p-4', eligibleForAlert ? 'border-clay/30 bg-clay/5' : 'border-line bg-white/60')}>
              <div className="flex items-center gap-2">
                <BellRing size={14} className={eligibleForAlert ? 'text-clay' : 'text-ink-muted'} />
                <p className="text-[0.8rem] font-medium text-ink">Trusted circle</p>
              </div>
              <p className="mt-1.5 text-[0.76rem] leading-relaxed text-ink-soft">
                {eligibleForAlert
                  ? `The pattern has enough evidence to draft a message to ${trusted.name}. Nothing has been sent — you review every word first.`
                  : `Nothing meets the bar to bother ${trusted.name} yet. Alerts need sustained evidence, not one bad day.`}
              </p>
              <Link to="/trusted" className="mt-2 inline-flex items-center gap-1 text-[0.76rem] font-medium text-forest">
                Open trusted circle <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionHeading
            eyebrow="What the pattern layer noticed"
            title="Every observation, with its evidence."
            blurb="No vague worry. Each card can point at the entries or check-ins behind it."
          />
          <p className="text-[0.72rem] text-ink-muted">{patterns.length} observations</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {patterns.length === 0 && (
            <div className="card-flat p-6 md:col-span-2">
              <p className="text-[0.86rem] text-ink-soft">
                Not enough signal yet to name a pattern. That is a normal, unremarkable result — keep writing and this page
                will have something to say.
              </p>
            </div>
          )}
          {patterns.map((pattern) => {
            const style = TONE_STYLES[pattern.tone];
            return (
              <article key={pattern.id} className={clsx('rounded-2xl border p-4', style.wrapper)}>
                <div className="flex items-center gap-2">
                  <span className={clsx('h-1.5 w-1.5 rounded-full', style.dot)} />
                  <span className="text-[0.64rem] uppercase tracking-[0.14em] text-ink-muted">{style.label}</span>
                </div>
                <h3 className="mt-1.5 font-display text-[1.08rem] leading-snug text-ink">{pattern.title}</h3>
                <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink-soft">{pattern.detail}</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {pattern.evidence.map((item) => (
                    <span key={item} className="rounded-full bg-white/70 px-2 py-0.5 text-[0.66rem] text-ink-muted">
                      {item}
                    </span>
                  ))}
                </div>
                {pattern.action && ACTION_LINKS[pattern.action] && (
                  <Link
                    to={ACTION_LINKS[pattern.action]}
                    className="mt-2.5 inline-flex items-center gap-1 text-[0.76rem] font-medium text-forest"
                  >
                    {pattern.action} <ArrowUpRight size={12} />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
        <p className="mt-4 flex items-start gap-2 text-[0.7rem] leading-relaxed text-ink-muted">
          <Info size={12} className="mt-0.5 shrink-0" />
          Patterns are descriptive, not diagnostic, and thresholds are deliberately conservative. A pattern is a prompt for
          a conversation — with yourself, a person you trust, or a clinician.
        </p>
      </section>

      <section className="mt-9">
        <SectionHeading eyebrow="Clinical check-ins" title="Screening history" />
        <div className="mt-4 grid gap-2">
          {checkins.length === 0 && (
            <div className="card-flat p-5 text-[0.84rem] text-ink-muted">
              No check-ins yet. <Link to="/check-in" className="text-forest underline decoration-forest/30 underline-offset-2">Take the PHQ-9</Link> to give the trend a clinical anchor.
            </div>
          )}
          {checkins.slice(0, 6).map((checkin) => (
            <div key={checkin.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-paper-deep px-2 py-1 text-[0.66rem] font-medium uppercase tracking-[0.08em] text-ink-soft">
                  {checkin.scale === 'PHQ9' ? 'PHQ-9' : 'GAD-7'}
                </span>
                <div>
                  <p className="text-[0.82rem] text-ink">
                    {checkin.band} · {checkin.score}/{checkin.maxScore}
                  </p>
                  <p className="text-[0.68rem] text-ink-muted">{formatDay(checkin.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {checkin.safetyFlag && (
                  <span className="rounded-full bg-rose/10 px-2 py-0.5 text-[0.66rem] text-rose">item 9 flagged</span>
                )}
                <span className="h-1.5 w-28 overflow-hidden rounded-full bg-ink/8">
                  <span
                    className={clsx('block h-full rounded-full', checkin.safetyFlag ? 'bg-rose' : checkin.score >= 10 ? 'bg-clay' : 'bg-sage')}
                    style={{ width: `${Math.max(4, (checkin.score / checkin.maxScore) * 100)}%` }}
                  />
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.7rem] text-ink-muted">
          Window starts {formatDay(addDays(startOfDay(new Date()), -(windowDays - 1)))}.
        </p>
      </section>
    </div>
  );
}
