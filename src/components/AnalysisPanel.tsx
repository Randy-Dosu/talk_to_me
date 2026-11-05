import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Info, Languages, Sparkles, TriangleAlert } from 'lucide-react';
import type { Analysis } from '../engine/types';
import { MOOD_BAND_COPY, RISK_LEVEL_COPY } from '../engine/analyze';
import { bandChip, distressTone, EMOTION_META } from '../lib/tone';
import { MoodBadge, RiskBadge } from './ui';

const CATEGORY_LABEL: Record<string, string> = {
  positive: 'positive language',
  negative: 'negative language',
  hopelessness: 'hopelessness',
  anxiety: 'anxiety',
  isolation: 'withdrawal',
  shame: 'shame / stigma',
  sleep: 'sleep',
  somatic: 'body symptoms',
  'self-harm': 'self-harm',
  'suicidal-ideation': 'risk language',
  negation: 'negation',
  intensifier: 'emphasis',
  support: 'support',
};

function Meter({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">{label}</span>
        <span className="font-display text-lg leading-none text-ink">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
        <div className={clsx('h-full rounded-full transition-[width] duration-700', tone)} style={{ width: `${Math.max(3, value)}%` }} />
      </div>
      {hint && <p className="mt-1.5 text-[0.7rem] text-ink-muted">{hint}</p>}
    </div>
  );
}

export default function AnalysisPanel({
  analysis,
  compact = false,
}: {
  analysis: Analysis;
  compact?: boolean;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const band = bandChip[analysis.moodBand];
  const distress = distressTone(analysis.distress);
  const riskCopy = RISK_LEVEL_COPY[analysis.risk.level];
  const lowConfidence = analysis.confidence < 0.4;
  const emotions = analysis.emotions.slice(0, compact ? 3 : 4);

  return (
    <div className="card p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">How this reads</p>
          <div className="mt-2 flex items-center gap-2">
            <MoodBadge band={analysis.moodBand} />
            <span className="text-[0.8rem] text-ink-muted">{MOOD_BAND_COPY[analysis.moodBand].blurb}</span>
          </div>
        </div>
        <RiskBadge level={analysis.risk.level} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Meter
          label="Mood score"
          value={analysis.moodScore}
          tone={band.dot}
          hint={`${band.label} · 0 is crushing, 100 is light`}
        />
        <Meter
          label="Distress load"
          value={analysis.distress}
          tone={analysis.distress >= 60 ? 'bg-rose' : analysis.distress >= 35 ? 'bg-clay' : 'bg-sage'}
          hint={distress.label}
        />
      </div>

      <div className="mt-5">
        <p className="text-[0.72rem] uppercase tracking-[0.12em] text-ink-muted">Emotional signature</p>
        <div className="mt-2.5 space-y-2.5">
          {emotions.map((emotion) => {
            const meta = EMOTION_META[emotion.label];
            return (
              <div key={emotion.label} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-[0.82rem] text-ink-soft">{meta.label}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/6">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                    style={{ width: `${Math.max(6, emotion.score * 100)}%`, backgroundColor: meta.hex }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right text-[0.72rem] tabular-nums text-ink-muted">
                  {Math.round(emotion.score * 100)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {analysis.risk.level !== 'none' && analysis.risk.subject === 'other' && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-gold/30 bg-gold/8 p-3">
          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[#8a6414]" />
          <p className="text-[0.78rem] leading-relaxed text-[#6f5310]">
            This reads as being about someone else. We have kept your own risk level clear, but there is guidance on{' '}
            <span className="font-medium">how to help a friend</span> on the safety page.
          </p>
        </div>
      )}

      {analysis.risk.level !== 'none' && analysis.risk.subject !== 'other' && !compact && (
        <p className="mt-4 rounded-2xl border border-line bg-white/70 p-3 text-[0.78rem] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">{riskCopy.label}. </span>
          {riskCopy.blurb}
        </p>
      )}

      {analysis.risk.suppressed && (
        <p className="mt-3 flex items-start gap-2 text-[0.74rem] leading-relaxed text-ink-muted">
          <Info size={13} className="mt-0.5 shrink-0" />
          Risk language was set aside because {analysis.risk.suppressedBy ?? 'the context was protective or figurative'}.
          We would rather explain that than quietly score you as safe.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line/70 pt-3 text-[0.72rem] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles size={12} />
          confidence {Math.round(analysis.confidence * 100)}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Languages size={12} />
          {analysis.language.support === 'english-with-ghanaian-markers'
            ? `Ghanaian English/Pidgin markers: ${analysis.language.markers.slice(0, 4).join(', ')}`
            : analysis.language.support === 'limited-coverage'
              ? 'limited vocabulary coverage'
              : 'standard English'}
        </span>
        <span>{analysis.wordCount} words</span>
      </div>

      {analysis.language.support === 'limited-coverage' && (
        <p className="mt-2 rounded-xl bg-gold/8 p-2.5 text-[0.72rem] leading-relaxed text-[#6f5310]">
          We could not read much of this reliably. The engine is validated on English and Ghanaian English/Pidgin only —
          Twi, Ga, Ewe and Hausa entries may be misread. Writing in English or Pidgin gives a truer reading for now.
        </p>
      )}

      {lowConfidence && analysis.risk.level === 'none' && (
        <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-muted">
          Short entry, light signal. Two or three sentences gives the engine something to work with — but a single line
          is still worth writing.
        </p>
      )}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setWhyOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl px-1 py-1.5 text-left text-[0.78rem] font-medium text-forest"
          aria-expanded={whyOpen}
        >
          Why it read it that way
          <ChevronDown size={15} className={clsx('transition-transform', whyOpen && 'rotate-180')} />
        </button>
        {whyOpen && (
          <ul className="anim-fade mt-2 space-y-1.5 rounded-2xl bg-paper-deep/60 p-3">
            {analysis.signals.length === 0 && (
              <li className="text-[0.76rem] text-ink-muted">
                Nothing in the lexicon matched strongly. Neutral entries are a normal result, not a failure.
              </li>
            )}
            {analysis.signals.map((signal, index) => (
              <li key={`${signal.phrase}-${index}`} className="flex items-start gap-2 text-[0.76rem] leading-relaxed">
                <span
                  className={clsx(
                    'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                    signal.weight < 0 ? 'bg-clay' : 'bg-sage',
                  )}
                />
                <span className="text-ink-soft">
                  <span className="italic text-ink">“{signal.phrase}”</span>
                  <span className="text-ink-muted"> — {CATEGORY_LABEL[signal.category] ?? signal.category}{signal.note ? `, ${signal.note}` : ''}</span>
                </span>
              </li>
            ))}
            <li className="border-t border-line/70 pt-2 text-[0.7rem] leading-relaxed text-ink-muted">
              Lexicon {analysis.version} · deterministic rules (VADER-style valence + curated marker groups). A reading,
              never a diagnosis. <span className="whitespace-nowrap">You are the authority on your own mood.</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
