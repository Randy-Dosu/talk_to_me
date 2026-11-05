import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Info, ShieldAlert } from 'lucide-react';
import { SCALES, bandFor, severityPercent } from '../engine/checkins';
import { formatDay } from '../engine/id';
import type { CheckIn as CheckInType, ScaleId } from '../engine/types';
import { useStore } from '../data/store';
import CrisisCard from '../components/CrisisCard';
import { SectionHeading } from '../components/ui';

export default function CheckIn() {
  const { state, addCheckIn } = useStore();
  const [scale, setScale] = useState<ScaleId>('PHQ9');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<CheckInType | null>(null);

  const definition = SCALES[scale];
  const answered = Object.keys(answers).length;
  const complete = answered === definition.items.length;

  const previous = useMemo(
    () =>
      [...state.checkins]
        .filter((c) => c.scale === scale)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0],
    [state.checkins, scale],
  );

  const reset = (next?: ScaleId) => {
    setAnswers({});
    setResult(null);
    if (next) setScale(next);
  };

  const submit = () => {
    const ordered = definition.items.map((_, index) => answers[index] ?? 0);
    const checkin = addCheckIn(scale, ordered);
    setResult(checkin);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (result) {
    const band = bandFor(definition, result.score);
    const delta = previous ? result.score - previous.score : null;
    return (
      <div className="container-page max-w-3xl py-8 lg:py-10">
        <p className="eyebrow">Check-in saved · {formatDay(result.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <h1 className="mt-2 font-display text-[2rem] leading-tight text-ink">
          {definition.name}: {result.score} of {result.maxScore} — {band.label}
        </h1>

        <div className="mt-5 card p-5">
          <div className="flex items-center justify-between text-[0.74rem] text-ink-muted">
            <span>0</span>
            <span>{result.maxScore}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/8">
            <div
              className={clsx('h-full rounded-full', result.safetyFlag ? 'bg-rose' : result.score >= 10 ? 'bg-clay' : 'bg-sage')}
              style={{ width: `${Math.max(3, severityPercent(result))}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {definition.bands.map((option) => (
              <span
                key={option.label}
                className={clsx(
                  'rounded-full border px-2 py-0.5 text-[0.68rem]',
                  option.label === band.label ? 'border-forest/30 bg-forest/8 text-forest' : 'border-line text-ink-muted',
                )}
              >
                {option.label}
              </span>
            ))}
          </div>
          <p className="mt-4 text-[0.88rem] leading-relaxed text-ink-soft">{band.advice}</p>
          {previous && delta !== null && (
            <p className="mt-2 text-[0.78rem] text-ink-muted">
              {delta === 0
                ? `Unchanged since ${formatDay(previous.createdAt)}.`
                : `${delta > 0 ? 'Up' : 'Down'} ${Math.abs(delta)} points since ${formatDay(previous.createdAt)} (${previous.score}).`}
              {Math.abs(delta) >= 5 && ' A change of five points or more is considered clinically meaningful.'}
            </p>
          )}
          <p className="mt-3 flex items-start gap-2 border-t border-line/70 pt-3 text-[0.72rem] leading-relaxed text-ink-muted">
            <Info size={12} className="mt-0.5 shrink-0" />
            A screening score is not a diagnosis. It is a structured way of describing the last two weeks, and a useful
            thing to bring to a clinician.
          </p>
        </div>

        {result.safetyFlag && (
          <div className="mt-5">
            <CrisisCard level="urgent" />
          </div>
        )}

        {!result.safetyFlag && result.score >= 10 && (
          <div className="mt-5 rounded-2xl border border-clay/30 bg-clay/5 p-4">
            <p className="flex items-center gap-2 text-[0.82rem] font-medium text-clay">
              <ShieldAlert size={15} /> This score is in the range where guidelines suggest a clinical conversation
            </p>
            <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
              You do not need a referral letter to call. The free helpline can tell you where to go in your region, and
              the Mental Health Authority can name facilities near you.
            </p>
            <Link to="/safety#resources" className="mt-2 inline-block text-[0.8rem] font-medium text-forest">
              See support options →
            </Link>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => reset()} className="btn btn-primary text-[0.82rem]">
            Take it again
          </button>
          <button
            onClick={() => reset(scale === 'PHQ9' ? 'GAD7' : 'PHQ9')}
            className="btn btn-ghost text-[0.82rem]"
          >
            Take the {scale === 'PHQ9' ? 'GAD-7' : 'PHQ-9'} next
          </button>
          <Link to="/patterns" className="btn btn-ghost text-[0.82rem]">
            See it in the pattern
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl py-8 lg:py-10">
      <SectionHeading
        eyebrow="Screening · public-domain instruments"
        title="Two minutes, nine questions, no account."
        blurb="PHQ-9 and GAD-7 are the standard screeners used in primary care worldwide. They describe the last two weeks. They do not diagnose anything on their own."
      />

      <div className="mt-5 flex rounded-full border border-line bg-white/60 p-1">
        {(['PHQ9', 'GAD7'] as ScaleId[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => reset(option)}
            className={clsx(
              'flex-1 rounded-full px-3 py-2 text-[0.8rem] transition-colors',
              scale === option ? 'bg-forest text-paper' : 'text-ink-muted hover:text-ink',
            )}
          >
            {option === 'PHQ9' ? 'PHQ-9 · depression' : 'GAD-7 · anxiety'}
          </button>
        ))}
      </div>

      <div className="mt-5 card p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-display text-[1.15rem] text-ink">{definition.fullName}</p>
            <p className="mt-1 max-w-lg text-[0.8rem] leading-relaxed text-ink-muted">{definition.lookback}</p>
          </div>
          <span className="rounded-full bg-paper-deep px-2.5 py-1 text-[0.7rem] text-ink-muted">
            {answered}/{definition.items.length}
          </span>
        </div>

        <ol className="mt-5 space-y-4">
          {definition.items.map((item, index) => (
            <li key={item.id} className="border-t border-line/60 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest/8 text-[0.66rem] font-medium text-forest">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.88rem] leading-snug text-ink">{item.text}</p>
                  {item.helper && <p className="mt-0.5 text-[0.72rem] leading-snug text-ink-muted">{item.helper}</p>}
                  {item.safety && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose/8 px-2 py-0.5 text-[0.66rem] text-rose">
                      <ShieldAlert size={10} /> any answer above zero opens the support card
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {definition.options.map((option) => {
                  const selected = answers[index] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [index]: option.value }))}
                      className={clsx(
                        'rounded-xl border px-2 py-2 text-center transition-colors',
                        selected
                          ? 'border-forest/40 bg-forest/8 text-forest'
                          : 'border-line bg-white/60 text-ink-soft hover:border-sage/50',
                      )}
                    >
                      <span className="block text-[0.73rem] font-medium leading-tight">{option.label}</span>
                      <span className="mt-0.5 block text-[0.64rem] text-ink-muted">{option.helper}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
          <p className="text-[0.7rem] text-ink-muted">{definition.source}</p>
          <button onClick={submit} disabled={!complete} className="btn btn-primary text-[0.82rem]">
            <Check size={14} /> Save check-in
          </button>
        </div>
        {!complete && (
          <p className="mt-1 text-right text-[0.68rem] text-ink-muted">
            {definition.items.length - answered} question{definition.items.length - answered === 1 ? '' : 's'} left
          </p>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-white/50 p-4">
        <p className="flex items-center gap-2 text-[0.8rem] font-medium text-ink">
          <ClipboardList size={14} className="text-forest" /> Why these questions
        </p>
        <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-soft">
          The PHQ-9 maps directly onto the nine DSM symptoms of a major depressive episode, with a score of 10 or above
          giving roughly 88% sensitivity and specificity for major depression. The GAD-7 uses the same scoring logic for
          anxiety. Both are free to use and widely accepted by Ghanaian clinicians.
        </p>
        <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-muted">
          Question 9 is treated separately in this app because a positive answer warrants follow-up regardless of the
          total score. If you have answered it above zero, the support card is on your screen, not behind a menu.
        </p>
      </div>

      {state.checkins.length > 0 && (
        <div className="mt-6">
          <p className="eyebrow mb-2">Previous check-ins</p>
          <div className="space-y-1.5">
            {[...state.checkins]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 4)
              .map((checkin) => (
                <div key={checkin.id} className="flex items-center justify-between rounded-xl border border-line bg-white/50 px-3 py-2 text-[0.78rem]">
                  <span className="text-ink-soft">
                    {checkin.scale === 'PHQ9' ? 'PHQ-9' : 'GAD-7'} · {formatDay(checkin.createdAt)}
                  </span>
                  <span className="text-ink">
                    {checkin.score}/{checkin.maxScore} · {checkin.band}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-[0.76rem]">
        <Link to="/journal" className="inline-flex items-center gap-1 text-ink-muted hover:text-forest">
          <ArrowLeft size={13} /> Back to journal
        </Link>
        <Link to="/safety" className="inline-flex items-center gap-1 text-forest">
          Support options <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
