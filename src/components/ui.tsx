import type { ReactNode } from 'react';
import clsx from 'clsx';
import { bandChip } from '../lib/tone';
import type { MoodBand, RiskLevel } from '../engine/types';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'forest' | 'clay' | 'gold' | 'rose' | 'sage';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-ink/5 text-ink-soft border-ink/10',
    forest: 'bg-forest/8 text-forest border-forest/20',
    clay: 'bg-clay/10 text-clay border-clay/20',
    gold: 'bg-gold/12 text-[#8a6414] border-gold/25',
    rose: 'bg-rose/10 text-rose border-rose/20',
    sage: 'bg-sage/12 text-[#456b4b] border-sage/25',
  } as const;
  return <span className={clsx('pill border', tones[tone], className)}>{children}</span>;
}

export function MoodBadge({ band }: { band: MoodBand }) {
  return (
    <span className={clsx('pill border', bandChip[band].classes)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', bandChip[band].dot)} />
      {bandChip[band].label}
    </span>
  );
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const map: Record<RiskLevel, { label: string; tone: string; dot: string }> = {
    none: { label: 'No safety signal', tone: 'bg-sage/10 text-[#456b4b] border-sage/20', dot: 'bg-sage' },
    watch: { label: 'Worth watching', tone: 'bg-gold/12 text-[#8a6414] border-gold/25', dot: 'bg-gold' },
    elevated: { label: 'Elevated concern', tone: 'bg-clay/12 text-clay border-clay/25', dot: 'bg-clay' },
    urgent: { label: 'Urgent', tone: 'bg-rose/12 text-rose border-rose/30', dot: 'bg-rose' },
  };
  const item = map[level];
  return (
    <span className={clsx('pill border', item.tone)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', item.dot)} />
      {item.label}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  blurb,
  align = 'left',
}: {
  eyebrow?: string;
  title: ReactNode;
  blurb?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={clsx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="text-balance text-[1.75rem] leading-tight text-ink md:text-[2.15rem]">{title}</h2>
      {blurb && <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-ink-muted">{blurb}</p>}
    </div>
  );
}

export function Stat({
  value,
  label,
  source,
}: {
  value: string;
  label: string;
  source?: string;
}) {
  return (
    <div className="border-l border-line pl-4">
      <p className="font-display text-[1.9rem] leading-none text-forest">{value}</p>
      <p className="mt-2 text-[0.82rem] leading-snug text-ink-soft">{label}</p>
      {source && <p className="mt-1.5 text-[0.68rem] uppercase tracking-[0.1em] text-ink-muted">{source}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-flat flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-forest/8 text-forest">{icon}</div>}
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked ? 'border-forest bg-forest' : 'border-line bg-ink/10',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-all',
            checked ? 'left-[1.45rem]' : 'left-0.5',
          )}
          style={{ height: '1.125rem', width: '1.125rem' }}
        />
      </button>
    </label>
  );
}
