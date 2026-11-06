import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Sparkles } from 'lucide-react';
import { analyse } from '../engine/analyze';
import { bandChip, EMOTION_META } from '../lib/tone';
import { MoodBadge, RiskBadge } from './ui';

/**
 * A live reading, with nothing preloaded. The box starts empty: no invented
 * entry, no sample persona. Whatever is typed here is the only text analysed.
 */
export default function LiveDemo() {
  const [text, setText] = useState('');
  const [live, setLive] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setLive(text), 380);
    return () => window.clearTimeout(timer);
  }, [text]);

  const analysis = useMemo(() => analyse(live || ' '), [live]);
  const band = bandChip[analysis.moodBand];
  const risky = analysis.risk.level === 'urgent' || analysis.risk.level === 'elevated';

  return (
    <div className="card relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[0.75rem] font-medium text-ink-soft">
          <span className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-clay/60" />
            <span className="h-2 w-2 rounded-full bg-gold/70" />
            <span className="h-2 w-2 rounded-full bg-sage/70" />
          </span>
          try it — nothing is saved
        </div>
        <span className="inline-flex items-center gap-1 text-[0.66rem] uppercase tracking-[0.1em] text-ink-muted">
          <Lock size={10} /> runs in your browser
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.05fr_1fr]">
        <div className="border-b border-line/70 p-4 lg:border-b-0 lg:border-r">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            aria-label="Try an entry"
            placeholder="Write a line about today, the way you would say it…"
            className="w-full resize-none rounded-xl border border-line/70 bg-white/70 p-3 text-[0.86rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted/60 focus:border-sage/60"
          />
          <p className="mt-1.5 text-[0.66rem] leading-snug text-ink-muted">
            The reading updates as you type — the same engine that runs inside the journal.
          </p>
        </div>

        <div className="bg-paper-deep/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MoodBadge band={analysis.moodBand} />
            <RiskBadge level={analysis.risk.level} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-ink-muted">mood</p>
              <p className="font-display text-2xl leading-none" style={{ color: band.hex }}>
                {analysis.moodScore}
                <span className="text-[0.68rem] text-ink-muted"> /100</span>
              </p>
            </div>
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.12em] text-ink-muted">distress load</p>
              <p className="font-display text-2xl leading-none text-ink">
                {analysis.distress}
                <span className="text-[0.68rem] text-ink-muted"> /100</span>
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {analysis.emotions.slice(0, 3).map((emotion) => (
              <div key={emotion.label} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[0.7rem] text-ink-soft">{EMOTION_META[emotion.label].label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/8">
                  <span
                    className="block h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(8, emotion.score * 100)}%`, backgroundColor: EMOTION_META[emotion.label].hex }}
                  />
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 line-clamp-3 min-h-[3.2rem] rounded-lg bg-white/60 p-2 text-[0.7rem] leading-relaxed text-ink-soft">
            {risky ? (
              <span className="font-medium text-rose">
                Risk language detected. In the app this opens the crisis card with free 24/7 numbers, immediately.
              </span>
            ) : analysis.signals.length ? (
              <>
                <span className="text-ink-muted">evidence: </span>
                {analysis.signals
                  .slice(0, 3)
                  .map((s) => `“${s.phrase}”`)
                  .join(' · ')}
              </>
            ) : (
              <span className="text-ink-muted">No strong signals — a plain day reads as plain.</span>
            )}
          </p>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[0.66rem] text-ink-muted">
              confidence {Math.round(analysis.confidence * 100)}% · {analysis.wordCount} words
            </span>
            <Link to="/model" className="inline-flex items-center gap-1 text-[0.7rem] font-medium text-forest">
              how this works <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line/70 bg-white/40 px-4 py-2 text-[0.66rem] text-ink-muted">
        <Sparkles size={11} className="text-gold" />
        Reading, not diagnosis. The engine is honest about what it cannot read — see the model card.
      </div>
    </div>
  );
}
