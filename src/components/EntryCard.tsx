import { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { ChevronDown, LifeBuoy, Mic, Trash2 } from 'lucide-react';
import type { JournalEntry, MoodBand } from '../engine/types';
import { formatDay, formatTime } from '../engine/id';
import { bandChip } from '../lib/tone';
import AnalysisPanel from './AnalysisPanel';
import { MoodBadge, RiskBadge } from './ui';
import { useStore } from '../data/store';

const BANDS: MoodBand[] = ['heavy', 'unsettled', 'steady', 'bright'];

export default function EntryCard({ entry, defaultOpen = false }: { entry: JournalEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { removeEntry, setFeltMood } = useStore();
  const shownBand = entry.feltMood ?? entry.analysis.moodBand;

  return (
    <article className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 md:px-5">
        <div className="min-w-0">
          <p className="text-[0.72rem] uppercase tracking-[0.1em] text-ink-muted">
            {formatDay(entry.createdAt, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatTime(entry.createdAt)}
            {entry.source === 'voice' && (
              <span className="ml-2 inline-flex items-center gap-1 text-forest/70">
                <Mic size={10} /> voice
              </span>
            )}
          </p>
          <p
            className={clsx(
              'mt-2 whitespace-pre-wrap text-[0.92rem] leading-relaxed text-ink',
              !open && 'line-clamp-3',
            )}
          >
            {entry.text}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <MoodBadge band={shownBand} />
          {entry.analysis.risk.level !== 'none' && <RiskBadge level={entry.analysis.risk.level} />}
          {entry.analysis.risk.subject === 'other' && (
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.62rem] text-[#6f5310]">
              about someone else
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-4 pb-3 md:px-5">
        <div className="flex items-center gap-3 text-[0.7rem] text-ink-muted">
          <span>distress {entry.analysis.distress}/100</span>
          <span>·</span>
          <span>{entry.analysis.emotions[0]?.label ?? 'neutral'}</span>
          {entry.feltMood && <span className="text-forest">· you corrected this</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-rose/10 hover:text-rose"
            aria-label="Delete entry"
          >
            <Trash2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="btn btn-quiet text-[0.76rem]"
            aria-expanded={open}
          >
            {open ? 'Close' : 'Read fully'}
            <ChevronDown size={13} className={clsx('transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {entry.analysis.risk.matches.some((match) => match.subject === 'other') && (
        <div className="mx-4 mb-3 flex items-start gap-2 rounded-2xl border border-gold/30 bg-gold/8 p-3 md:mx-5">
          <LifeBuoy size={15} className="mt-0.5 shrink-0 text-[#8a6414]" />
          <div className="text-[0.78rem] leading-relaxed text-[#6f5310]">
            <p>
              This sounds like it is about someone else, so your own pattern stays clear. If they are in danger right
              now, call <a className="font-medium underline underline-offset-2" href="tel:112">112</a> or the free
              24/7 Mental Health Authority line <a className="font-medium underline underline-offset-2" href="tel:0800678678">0800 678 678</a>;
              stay with them if you can.
            </p>
            <Link to="/safety#someone" className="mt-1 inline-block font-medium underline underline-offset-2">
              How to talk to a friend who is not okay
            </Link>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="border-t border-rose/20 bg-rose/5 px-4 py-3 md:px-5">
          <p className="text-[0.8rem] text-ink-soft">
            Delete this entry and its reading? This cannot be undone.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              className="btn bg-rose px-3 py-1.5 text-[0.76rem] text-white hover:bg-[#933934]"
            >
              Delete
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn btn-ghost px-3 py-1.5 text-[0.76rem]">
              Keep
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="anim-fade border-t border-line/70 p-4 md:p-5">
          <AnalysisPanel analysis={entry.analysis} />

          <div className="mt-4 rounded-2xl border border-line bg-white/60 p-3">
            <p className="text-[0.76rem] font-medium text-ink">Did we read the day right?</p>
            <p className="mt-0.5 text-[0.72rem] text-ink-muted">
              Your word beats the model&rsquo;s. Correct it and the pattern uses your version.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {BANDS.map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => setFeltMood(entry.id, band)}
                  className={clsx(
                    'rounded-full border px-2.5 py-1 text-[0.72rem] transition-colors',
                    shownBand === band ? bandChip[band].classes : 'border-line text-ink-muted hover:border-ink/20',
                  )}
                >
                  {bandChip[band].label}
                </button>
              ))}
              {entry.feltMood && (
                <button
                  type="button"
                  onClick={() => setFeltMood(entry.id, null)}
                  className="text-[0.7rem] text-ink-muted underline decoration-ink-muted/40 underline-offset-2 hover:text-forest"
                >
                  use the reading
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
