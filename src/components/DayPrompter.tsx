import { Bell, BellRing, Sunrise, Sunset, X } from 'lucide-react';
import type { PromptKind } from '../data/prompts';
import { openerFor, daySeed } from '../data/prompts';

/** One question, a way to start writing, and a way to close it. No suggestions. */
export default function DayPrompter({
  kind,
  onStart,
  onDismiss,
  onEnableNotifications,
  permission,
}: {
  kind: PromptKind;
  onStart: () => void;
  onDismiss: () => void;
  onEnableNotifications?: () => void;
  permission?: 'unsupported' | 'default' | 'granted' | 'denied';
}) {
  const morning = kind === 'morning';
  const Icon = morning ? Sunrise : Sunset;

  return (
    <section
      className={`mb-4 rounded-2xl border p-4 ${
        morning ? 'border-gold/35 bg-gold/8' : 'border-forest/20 bg-forest/[0.05]'
      }`}
      aria-label={morning ? 'Morning plan' : 'Evening check-in'}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            morning ? 'bg-gold/20 text-[#8a6414]' : 'bg-forest/10 text-forest'
          }`}
        >
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.66rem] uppercase tracking-[0.12em] text-ink-muted">{morning ? 'Morning' : 'Evening'}</p>
          <p className="mt-1 text-[0.95rem] leading-snug text-ink">{openerFor(kind, daySeed())}</p>
          <button
            type="button"
            onClick={onStart}
            className="mt-2 rounded-full border border-forest/30 px-3 py-1 text-[0.78rem] font-medium text-forest hover:bg-forest/8"
          >
            Write
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {permission === 'default' && onEnableNotifications && (
            <button
              type="button"
              onClick={onEnableNotifications}
              className="rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-forest"
              aria-label="Turn on reminders"
              title="Turn on reminders"
            >
              {morning ? <Bell size={14} /> : <BellRing size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1.5 text-ink-muted hover:bg-ink/5 hover:text-ink"
            aria-label="Dismiss for today"
            title="Dismiss for today"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
