import { Link } from 'react-router-dom';

export function Mark({ size = 34, tone = 'forest' }: { size?: number; tone?: 'forest' | 'paper' }) {
  const stroke = tone === 'forest' ? '#1F4B3F' : '#FBF7F0';
  const accent = tone === 'forest' ? '#BD5A3C' : '#CF9A35';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" stroke={stroke} strokeOpacity="0.28" />
      <path d="M20 6.5c4.6 6.2 4.6 10.6 0 14.6-4.6-4-4.6-8.4 0-14.6Z" stroke={stroke} strokeWidth="1.5" />
      <path d="M20 33.5c-4.6-6.2-4.6-10.6 0-14.6 4.6 4 4.6 8.4 0 14.6Z" stroke={stroke} strokeWidth="1.5" />
      <path d="M6.5 20c6.2-4.6 10.6-4.6 14.6 0-4 4.6-8.4 4.6-14.6 0Z" stroke={stroke} strokeWidth="1.5" />
      <path d="M33.5 20c-6.2 4.6-10.6 4.6-14.6 0 4-4.6 8.4-4.6 14.6 0Z" stroke={stroke} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="3.1" fill={accent} />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5">
      <Mark size={compact ? 28 : 34} />
      <span className="leading-none">
        <span className="block font-display text-[1.35rem] font-medium tracking-tight text-ink">
          nkommo
        </span>
        {!compact && (
          <span className="mt-0.5 block text-[0.6rem] uppercase tracking-[0.22em] text-ink-muted">
            talk to me
          </span>
        )}
      </span>
    </Link>
  );
}
