import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Languages, LockKeyhole, UserRound } from 'lucide-react';
import { useStore } from '../data/store';
import { Mark } from '../components/Logo';

const LANGUAGES = [
  { id: 'en', label: 'English', hint: 'Standard English' },
  { id: 'tw-en', label: 'English + Twi', hint: 'A mix of both' },
] as const;

export default function Signup() {
  const { state, updateSettings } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState(state.settings.displayName);
  const [language, setLanguage] = useState<'en' | 'tw-en'>(state.settings.language);

  const start = () => {
    const displayName = name.trim();
    if (!displayName) return;

    updateSettings({ displayName, language, onboarded: true });
    navigate('/journal');
  };

  return (
    <div className="container-page flex min-h-[calc(100dvh-4rem)] items-center justify-center py-8 sm:py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-line bg-white/70 shadow-[0_24px_70px_-42px_rgba(22,33,29,0.5)] lg:grid-cols-[1fr_0.95fr]">
        <section className="relative flex min-h-64 flex-col justify-between overflow-hidden bg-forest p-7 text-paper sm:p-10 lg:min-h-[36rem]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10"
          >
            <div className="absolute inset-8 rounded-full border border-white/10" />
            <div className="absolute inset-16 rounded-full border border-white/10" />
          </div>
          <div className="relative">
            <Mark size={42} />
            <p className="mt-8 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-paper/65">
              A quiet place to begin
            </p>
            <h1 className="mt-3 max-w-md text-balance font-display text-[2.4rem] leading-[1.08] text-paper sm:text-[3rem]">
              Start with what you want to be called.
            </h1>
            <p className="mt-4 max-w-sm text-[0.92rem] leading-relaxed text-paper/75">
              A little space to write, notice how you feel, and find a next step when you need one.
            </p>
          </div>
          <div className="relative mt-10 flex items-center gap-2 text-[0.78rem] text-paper/75">
            <LockKeyhole size={14} />
            No account needed. Your profile stays on this device.
          </div>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-7">
            <p className="eyebrow">Your profile</p>
            <h2 className="mt-2 font-display text-[1.8rem] leading-tight text-ink">
              Make this space yours.
            </h2>
            <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-muted">
              Just two details to get started. You can change them later.
            </p>
          </div>

          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              start();
            }}
          >
            <div>
              <label htmlFor="display-name" className="mb-2 flex items-center gap-2 text-[0.82rem] font-medium text-ink">
                <UserRound size={15} className="text-forest" />
                What should we call you?
              </label>
              <input
                autoComplete="name"
                autoFocus
                id="display-name"
                name="displayName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name or nickname"
                maxLength={60}
                required
                className="field"
              />
            </div>

            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-[0.82rem] font-medium text-ink">
                <Languages size={15} className="text-forest" />
                Language preference
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLanguage(option.id)}
                    aria-pressed={language === option.id}
                    className={`rounded-2xl border p-3.5 text-left transition-colors ${
                      language === option.id
                        ? 'border-forest bg-forest/6 ring-1 ring-forest/15'
                        : 'border-line bg-white/60 hover:border-sage/50 hover:bg-white'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 text-[0.82rem] font-medium text-ink">
                      {option.label}
                      {language === option.id && <Check size={14} className="shrink-0 text-forest" />}
                    </span>
                    <span className="mt-1 block text-[0.7rem] text-ink-muted">{option.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <button type="submit" disabled={!name.trim()} className="btn btn-primary w-full py-3 text-[0.9rem]">
              Start writing <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-5 text-center text-[0.75rem] leading-relaxed text-ink-muted">
            Want to know more first?{' '}
            <Link to="/about" className="font-medium text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">
              Learn about Nkommo
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
