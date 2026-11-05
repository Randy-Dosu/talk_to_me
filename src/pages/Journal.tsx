import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, BookOpenText, CalendarCheck, Flame, Sparkles } from 'lucide-react';
import Composer from '../components/Composer';
import CrisisCard from '../components/CrisisCard';
import EntryCard from '../components/EntryCard';
import Onboarding from '../components/Onboarding';
import { EmptyState, MoodBadge } from '../components/ui';
import { useStore, useSortedEntries } from '../data/store';
import { addDays, dayKey, formatDay, greeting, startOfDay } from '../engine/id';
import { streak, weeklyAverages } from '../engine/trends';

export default function Journal() {
  const { state, updateSettings, loadDemo } = useStore();
  const entries = useSortedEntries();
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const todaysEntries = useMemo(
    () => entries.filter((e) => dayKey(e.createdAt) === dayKey(new Date())),
    [entries],
  );
  const earlierEntries = useMemo(
    () => entries.filter((e) => dayKey(e.createdAt) !== dayKey(new Date())),
    [entries],
  );

  const needsSupport = useMemo(() => {
    const cutoff = addDays(startOfDay(new Date()), -7).getTime();
    return entries.some(
      (e) => new Date(e.createdAt).getTime() >= cutoff && (e.analysis.risk.level === 'urgent' || e.analysis.risk.level === 'elevated'),
    ) || state.checkins.some(
      (c) => c.safetyFlag && new Date(c.createdAt).getTime() >= cutoff,
    );
  }, [entries, state.checkins]);

  const week = weeklyAverages(entries);
  const daysInARow = streak(entries);
  const latestCheckin = [...state.checkins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  // Reuse the stored reading instead of re-running the engine on render.
  const preview = entries[0]?.analysis ?? null;

  if (!state.settings.onboarded) {
    return (
      <div className="container-page py-12">
        <Onboarding />
      </div>
    );
  }

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">
            {formatDay(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="mt-2 text-balance font-display text-[2rem] leading-tight text-ink md:text-[2.5rem]">
            {greeting()}
            {state.settings.displayName ? `, ${state.settings.displayName}` : ''}.
            <span className="block text-[1rem] font-normal text-ink-muted">
              {state.settings.language === 'tw-en' ? 'How is your heart today?' : 'How are you today?'}
            </span>
          </h1>
        </div>
        <label className="flex items-center gap-2 text-[0.72rem] text-ink-muted">
          <Sparkles size={12} className="text-gold" />
          <span className="sr-only">Display name</span>
          <input
            value={state.settings.displayName}
            onChange={(e) => updateSettings({ displayName: e.target.value })}
            placeholder="Your name or alias"
            className="w-40 rounded-full border border-line bg-white/60 px-3 py-1.5 text-[0.76rem] outline-none focus:border-sage/60"
            maxLength={40}
          />
        </label>
      </div>

      {needsSupport && (
        <div className="mt-6">
          <CrisisCard level="elevated" />
        </div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Composer onSaved={(entry) => setJustSaved(entry.id)} />
          {justSaved && (
            <p className="text-[0.76rem] text-ink-muted">
              Saved. <Link to="/patterns" className="text-forest underline decoration-forest/30 underline-offset-2">See how it fits the pattern</Link>.
            </p>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[1.2rem] text-ink">Today</h2>
              <span className="text-[0.72rem] text-ink-muted">
                {todaysEntries.length} {todaysEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
            {todaysEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-white/40 p-6 text-center">
                <p className="text-[0.85rem] text-ink-muted">Nothing yet today. One line counts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} defaultOpen={entry.id === justSaved} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[1.2rem] text-ink">Earlier</h2>
              <span className="text-[0.72rem] text-ink-muted">{earlierEntries.length} kept</span>
            </div>
            {earlierEntries.length === 0 ? (
              <EmptyState
                icon={<BookOpenText size={18} />}
                title="Your history starts whenever you do"
                body="Want to see how the pattern looks first? Load a fictional sample."
                action={
                  <button onClick={loadDemo} className="btn btn-ghost text-[0.8rem]">
                    Explore with sample data
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {earlierEntries.slice(0, 12).map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
                {earlierEntries.length > 12 && (
                  <p className="pt-1 text-center text-[0.76rem] text-ink-muted">Showing the 12 most recent.</p>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="card p-5">
            <p className="eyebrow">This week</p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="font-display text-[2.1rem] leading-none text-forest">
                  {week.thisWeek ?? '—'}
                  <span className="text-[0.75rem] font-normal text-ink-muted"> /100</span>
                </p>
                <p className="mt-1 text-[0.74rem] text-ink-muted">
                  {week.lastWeek !== null && week.delta !== null
                    ? `${week.delta >= 0 ? 'up' : 'down'} ${Math.abs(week.delta)} on last week`
                    : 'first week of readings'}
                </p>
              </div>
              {preview && <MoodBadge band={preview.moodBand} />}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
              <div className="flex items-center gap-2">
                <Flame size={15} className="text-clay" />
                <div>
                  <p className="text-[0.95rem] font-medium text-ink">{daysInARow}</p>
                  <p className="text-[0.66rem] uppercase tracking-[0.1em] text-ink-muted">day streak</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarCheck size={15} className="text-sage" />
                <div>
                  <p className="text-[0.95rem] font-medium text-ink">{week.thisCount}</p>
                  <p className="text-[0.66rem] uppercase tracking-[0.1em] text-ink-muted">entries this week</p>
                </div>
              </div>
            </div>
            <Link to="/patterns" className="mt-4 flex items-center justify-between rounded-xl bg-paper-deep/60 px-3 py-2 text-[0.78rem] text-forest">
              See the full pattern <ArrowRight size={13} />
            </Link>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Clinical check-in</p>
              <Activity size={14} className="text-ink-muted" />
            </div>
            {latestCheckin ? (
              <>
                <p className="mt-2 text-[0.86rem] text-ink">
                  {latestCheckin.scale === 'PHQ9' ? 'PHQ-9' : 'GAD-7'} ·{' '}
                  <span className="font-medium">{latestCheckin.band}</span>
                </p>
                <p className="text-[0.74rem] text-ink-muted">
                  {latestCheckin.score}/{latestCheckin.maxScore} · {formatDay(latestCheckin.createdAt)}
                </p>
                {latestCheckin.safetyFlag && (
                  <p className="mt-2 rounded-lg bg-rose/8 px-2 py-1.5 text-[0.72rem] leading-snug text-rose">
                    Question 9 was answered above zero. The helplines on the safety page are free and answered.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-[0.8rem] leading-snug text-ink-muted">Two minutes. Stays here.</p>
            )}
            <Link to="/check-in" className="btn btn-ghost mt-3 w-full text-[0.78rem]">
              {latestCheckin ? 'Check in again' : 'Take the screening'}
            </Link>
          </div>

        </aside>
      </div>
    </div>
  );
}
