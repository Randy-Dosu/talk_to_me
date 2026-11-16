import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Pause, Play, RotateCcw } from 'lucide-react';

type Phase = 'in' | 'hold' | 'out';

const PHASES: { phase: Phase; seconds: number; label: string; cue: string }[] = [
  { phase: 'in', seconds: 4, label: 'Breathe in', cue: 'through your nose, slow' },
  { phase: 'hold', seconds: 4, label: 'Hold', cue: 'soft shoulders' },
  { phase: 'out', seconds: 6, label: 'Breathe out', cue: 'through your mouth, longer' },
];

/** Box-ish breathing: 4 in, 4 hold, 6 out. Deliberately simple and interruptible. */
export default function BreathingExercise() {
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);
  const [cycles, setCycles] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;
        setIndex((current) => {
          const next = (current + 1) % PHASES.length;
          if (next === 0) setCycles((c) => c + 1);
          setRemaining(PHASES[next].seconds);
          return next;
        });
        return PHASES[(index + 1) % PHASES.length].seconds;
      });
    }, 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [running, index]);

  const phase = PHASES[index];
  const reset = () => {
    setRunning(false);
    setIndex(0);
    setRemaining(PHASES[0].seconds);
    setCycles(0);
  };

  return (
    <div className="card-flat flex flex-col items-center px-5 py-7 text-center">
      <p className="eyebrow">Two minutes · box breathing</p>
      <div className="relative mt-6 flex h-40 w-40 items-center justify-center">
        <span
          className={clsx(
            'absolute inset-0 rounded-full border border-forest/20 bg-forest/6 transition-transform duration-[1200ms] ease-in-out',
            running && phase.phase === 'in' && 'scale-100',
            running && phase.phase === 'hold' && 'scale-100',
            running && phase.phase === 'out' && 'scale-75',
            !running && 'scale-90',
          )}
        />
        <span
          className={clsx(
            'absolute inset-6 rounded-full border border-forest/15 bg-forest/10 transition-transform duration-[1200ms] ease-in-out',
            running && phase.phase === 'in' && 'scale-100',
            running && phase.phase === 'hold' && 'scale-95',
            running && phase.phase === 'out' && 'scale-70',
            !running && 'scale-90',
          )}
        />
        <div className="relative">
          <p className="font-display text-3xl text-forest">{running ? remaining : '4·4·6'}</p>
          <p className="mt-1 text-[0.72rem] uppercase tracking-[0.14em] text-ink-muted">
            {running ? phase.label : 'ready'}
          </p>
        </div>
      </div>
      <p className="mt-4 min-h-10 text-[0.82rem] text-ink-soft">
        {running ? phase.cue : 'A longer out-breath tells your body the danger has passed.'}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => setRunning((r) => !r)} className="btn btn-primary px-4 py-2 text-[0.8rem]">
          {running ? <Pause size={13} /> : <Play size={13} />}
          {running ? 'Pause' : cycles > 0 ? 'Continue' : 'Start'}
        </button>
        <button type="button" onClick={reset} className="btn btn-ghost px-3 py-2 text-[0.8rem]" aria-label="Reset">
          <RotateCcw size={13} />
        </button>
      </div>
      {cycles > 0 && <p className="mt-3 text-[0.72rem] text-ink-muted">{cycles} {cycles === 1 ? 'round' : 'rounds'} completed</p>}
    </div>
  );
}
