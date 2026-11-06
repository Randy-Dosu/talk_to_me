import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Activity, HeartHandshake, LifeBuoy, Menu, MessageCircle, Phone, ShieldCheck, X } from 'lucide-react';
import { Wordmark } from './Logo';
import { useStore } from '../data/store';
import { useReminderScheduler } from '../lib/useReminders';
import { RESOURCES } from '../data/resources';

const NAV = [
  { to: '/journal', label: 'Talk', icon: MessageCircle },
  { to: '/patterns', label: 'Patterns', icon: Activity },
  { to: '/check-in', label: 'Check-in', icon: HeartHandshake },
  { to: '/safety', label: 'Safety', icon: LifeBuoy },
  { to: '/model', label: 'Model card', icon: ShieldCheck },
];

const TABS = NAV.slice(0, 4);

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { state } = useStore();
  useReminderScheduler(state.settings, state.entries);
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isChat = ['/journal', '/chat', '/signup'].includes(location.pathname);
  const helpline = RESOURCES[0];

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={clsx(
          'sticky top-0 z-40 border-b transition-colors',
          isLanding
            ? 'border-transparent bg-paper/80 backdrop-blur-md'
            : 'border-line/70 bg-paper/90 backdrop-blur-md',
        )}
      >
        <div className="kente-strip opacity-90" />
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Wordmark />

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  clsx(
                    'rounded-full px-3.5 py-2 text-[0.84rem] font-medium transition-colors',
                    isActive ? 'bg-forest/10 text-forest' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/safety"
              className="hidden items-center gap-1.5 rounded-full border border-rose/25 bg-rose/8 px-3 py-1.5 text-[0.78rem] font-medium text-rose transition-colors hover:bg-rose/12 sm:inline-flex"
            >
              <Phone size={13} strokeWidth={2.2} />
              Need help now
            </a>
            <Link to="/journal" className="btn btn-primary hidden text-[0.82rem] lg:inline-flex">
              Talk
            </Link>
            <button
              type="button"
              className="btn btn-ghost px-2.5 py-2 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="anim-fade border-t border-line bg-paper/98 lg:hidden">
            <div className="container-page grid gap-1 py-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
                      isActive ? 'bg-forest/10 text-forest' : 'text-ink-soft',
                    )
                  }
                >
                  <item.icon size={16} />
                  {item.label}
                </NavLink>
              ))}
              <Link to="/about" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft">
                <ShieldCheck size={16} /> Why this exists
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* mobile tab bar: the four things you reach for in a bad week */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 py-2.5 text-[0.63rem] font-medium transition-colors',
                  isActive ? 'text-forest' : 'text-ink-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {!isChat && (
      <footer className="mb-16 mt-16 border-t border-line/80 bg-paper-deep/50 lg:mb-0 lg:mt-20">
        <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-[0.8rem] leading-relaxed text-ink-muted">
              A private journal and mood tracker built for Ghana. Not a doctor. Not a crisis service.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[0.75rem] text-ink-muted">
              <ShieldCheck size={14} className="text-sage" />
              No account. No server. No analytics.
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">If today is heavy</p>
            <a
              href={`tel:${helpline.tel}`}
              className="font-display text-xl text-forest underline decoration-forest/30 underline-offset-4"
            >
              {helpline.contact}
            </a>
            <p className="mt-1 text-[0.78rem] leading-snug text-ink-muted">
              Mental Health Authority helpline · free · 24/7
            </p>
            <ul className="mt-4 space-y-2 text-[0.78rem] text-ink-soft">
              <li>
                <a href="tel:112" className="hover:text-forest">112 · emergency</a>
              </li>
              <li>
                <a href="tel:+233302228688" className="hover:text-forest">0302 228 688 · Accra Psychiatric Hospital</a>
              </li>
              <li>
                <Link to="/safety" className="text-forest underline decoration-forest/30 underline-offset-2">
                  All support options
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">The work</p>
            <ul className="space-y-2 text-[0.82rem] text-ink-soft">
              <li><Link to="/about" className="hover:text-forest">Why this exists</Link></li>
              <li><Link to="/welcome" className="hover:text-forest">What this is</Link></li>
              <li><Link to="/model" className="hover:text-forest">Model card &amp; evaluation</Link></li>
              <li><Link to="/research" className="hover:text-forest">Research notes</Link></li>
              <li><Link to="/privacy" className="hover:text-forest">Privacy &amp; data</Link></li>
              <li><Link to="/settings" className="hover:text-forest">Settings</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line/70">
          <div className="container-page flex flex-col gap-2 py-5 text-[0.7rem] leading-relaxed text-ink-muted md:flex-row md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Nkommo · Built in Accra · Not a medical device.</p>
            <p>If you are in immediate danger, call 112. Nkommo cannot contact anyone for you.</p>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
