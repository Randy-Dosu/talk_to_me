import { Bell, BellRing, Sunrise, Sunset, X } from 'lucide-react';
import type { PromptKind, Starter } from '../data/prompts';
import { openerFor, daySeed } from '../data/prompts';
import type { StarterState } from '../data/prompts';

/**
 * The in-app prompter. Morning asks what the day needs; evening asks what it
 * cost. Both are questions, not nudges to "stay positive".
 */
export default function DayPrompter({
  kind,
  state,
  starters,
  onUse,
  onDismiss,
  onEnableNotifications,
  permission,
}: {
  kind: PromptKind;
  state: StarterState;
  starters: Starter[];
  onUse: (text: string) => void;
  onDismiss: () => void;
  onEnableNotifications?: () => void;
  permission?: 'unsupported' | 'default' | 'granted' | 'denied';
}) {
  const morning = kind === 'morning';
  const Icon = morning ? Sunrise : Sunset;

  return (
    <section
      className={`mb-5 overflow-hidden rounded-2xl border ${
        morning ? 'border-gold/35 bg-gold/8' : 'border-forest/20 bg-forest/[0.05]'
      }`}
      aria-label={morning ? 'Morning plan' : 'Evening check-in'}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              morning ? 'bg-gold/20 text-[#8a6414]' : 'bg-forest/10 text-forest'
            }`}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.66rem] uppercase tracking-[0.12em] text-ink-muted">
              {morning ? 'Morning · plan the day' : 'Evening · close the day'}
            </p>
            <p className="mt-1 text-[0.95rem] leading-snug text-ink">{openerFor(kind, state, daySeed())}</p>
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

        <ul className="mt-3 space-y-1.5">
          {starters.map((starter) => (
            <li key={starter.id}>
              <button
                type="button"
                onClick={() => onUse(starter.text)}
                className="group flex w-full items-baseline justify-between gap-3 rounded-xl border border-line/80 bg-white/60 px-3 py-2 text-left transition-colors hover:border-sage/50 hover:bg-white"
              >
                <span className="text-[0.84rem] leading-snug text-ink-soft group-hover:text-ink">{starter.text}</span>
                <span className="shrink-0 text-[0.6rem] uppercase tracking-[0.08em] text-ink-muted">{starter.mechanism}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
