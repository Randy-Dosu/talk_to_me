import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { ArrowRight, HeartHandshake, Phone, ShieldCheck } from 'lucide-react';
import { RESOURCES, HELPLINE_NOTE } from '../data/resources';

/**
 * The most important component in the app.
 *
 * Rules it follows:
 *  - never blocks the writer, never moralises, never panics;
 *  - leads with a human phone number, not with a lecture;
 *  - says plainly what the app cannot do;
 *  - offers the safety plan and a message template as the next step.
 */

export default function CrisisCard({
  level = 'elevated',
  compact = false,
}: {
  level?: 'elevated' | 'urgent' | 'watch';
  compact?: boolean;
}) {
  const urgent = level === 'urgent';
  const helplines = RESOURCES.filter((r) => r.kind !== 'ngo');

  return (
    <section
      className={clsx(
        'overflow-hidden rounded-3xl border',
        urgent ? 'border-rose/35 bg-rose/6' : 'border-clay/30 bg-clay/5',
      )}
      aria-live="polite"
    >
      <div className={clsx('h-1 w-full', urgent ? 'bg-rose/70' : 'bg-clay/60')} />
      <div className={clsx('p-5 md:p-6', compact && 'md:p-5')}>
        <div className="flex items-start gap-3">
          <span
            className={clsx(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              urgent ? 'bg-rose/15 text-rose' : 'bg-clay/15 text-clay',
            )}
          >
            <HeartHandshake size={17} />
          </span>
          <div className="min-w-0">
            <h2 className={clsx('font-display text-[1.3rem] leading-snug', urgent ? 'text-rose' : 'text-clay')}>
              {urgent ? 'What you wrote matters. Please talk to a person now.' : 'This sounds heavy. You do not have to sit with it alone.'}
            </h2>
            <p className="mt-2 max-w-2xl text-[0.88rem] leading-relaxed text-ink-soft">
              {urgent
                ? 'Your entry contains language that suggests you may be thinking about ending your life or hurting yourself. That is a real emergency, not an overreaction — and it is not something you have to manage by yourself tonight.'
                : 'Some of what you wrote is the kind of thing that gets heavier in silence. A trained person on the other end of a phone is a better listener than any app, including this one.'}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {helplines.map((r) => (
                <a
                  key={r.id}
                  href={`tel:${r.tel}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/80 px-4 py-3 transition-colors hover:border-forest/30 hover:bg-white"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[0.7rem] uppercase tracking-[0.12em] text-ink-muted">
                      {r.name}
                    </span>
                    <span className="mt-0.5 block font-display text-[1.05rem] text-forest">{r.contact}</span>
                    <span className="block text-[0.7rem] text-ink-muted">{r.hours}</span>
                  </span>
                  <Phone size={16} className="shrink-0 text-ink-muted transition-colors group-hover:text-forest" />
                </a>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link to="/safety" className="btn btn-primary text-[0.8rem]">
                <ShieldCheck size={14} /> Open my safety plan
              </Link>
              <Link to="/safety#someone" className="btn btn-ghost text-[0.8rem]">
                What to say to someone <ArrowRight size={14} />
              </Link>
            </div>

            {!compact && (
              <p className="mt-4 border-t border-line/70 pt-3 text-[0.72rem] leading-relaxed text-ink-muted">
                {HELPLINE_NOTE}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
