import { useState } from 'react';
import clsx from 'clsx';
import { ArrowRight, Check, EyeOff, Lock, Phone, Sparkles } from 'lucide-react';
import { useStore } from '../data/store';
import { Mark } from './Logo';

const STEPS = ['The promise', 'Your name', 'Your safety net'];

export default function Onboarding() {
  const { state, updateSettings, updatePlan, loadDemo } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(state.settings.displayName);
  const [language, setLanguage] = useState<'en' | 'tw-en'>(state.settings.language);
  const [contactName, setContactName] = useState(state.settings.trusted?.name ?? '');
  const [contactPhone, setContactPhone] = useState(state.settings.trusted?.phone ?? '');
  const [acknowledged, setAcknowledged] = useState(false);

  const finish = () => {
    updateSettings({
      displayName: name.trim(),
      language,
      onboarded: true,
      trusted: contactName.trim()
        ? {
            name: contactName.trim(),
            relationship: 'Trusted contact',
            phone: contactPhone.trim(),
            enabled: true,
            escalateAfterDays: 3,
            shareJournals: false,
          }
        : null,
    });
    if (contactName.trim()) {
      updatePlan({
        people: [{ name: contactName.trim(), phone: contactPhone.trim(), note: 'Trusted contact added at setup' }],
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="anim-rise max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-paper shadow-2xl sm:rounded-3xl">
        <div className="kente-strip rounded-t-3xl sm:rounded-t-3xl" />
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between">
            <Mark size={30} />
            <div className="flex gap-1.5">
              {STEPS.map((label, index) => (
                <span
                  key={label}
                  className={clsx('h-1.5 rounded-full transition-all', index === step ? 'w-7 bg-forest' : 'w-1.5 bg-line')}
                />
              ))}
            </div>
          </div>

          {step === 0 && (
            <div className="anim-fade mt-6">
              <p className="eyebrow">Welcome · akwaaba</p>
              <h1 className="mt-2 text-balance font-display text-[1.8rem] leading-tight text-ink">
                A place to say it before you say it out loud.
              </h1>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft">
                Speak or write. Nkommo reads the entry for signs of depression, anxiety and risk, and shows you the
                pattern over time.
              </p>
              <ul className="mt-5 space-y-3">
                {[
                  { icon: Lock, text: 'Stored in this browser. No server to leak.' },
                  { icon: EyeOff, text: 'No email, phone or name needed.' },
                  { icon: Phone, text: 'Risk language gives you numbers, not a lecture.' },
                ].map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-[0.86rem] leading-relaxed text-ink-soft">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest/8 text-forest">
                      <item.icon size={14} />
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-2xl border border-line bg-white/60 p-3 text-[0.76rem] leading-relaxed text-ink-muted">
                A screening aid — not a diagnosis, not an emergency service. In danger now, call{' '}
                <a href="tel:112" className="font-medium text-forest underline">112</a> or the free 24/7 helpline{' '}
                <a href="tel:0800678678" className="font-medium text-forest underline">0800 678 678</a>.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="anim-fade mt-6">
              <p className="eyebrow">Step two</p>
              <h1 className="mt-2 font-display text-[1.7rem] leading-tight text-ink">What should we call you?</h1>
              <p className="mt-2 text-[0.86rem] text-ink-muted">A nickname is fine. You can leave it blank.</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ama, Kofi, or nothing at all"
                className="field mt-4"
                maxLength={40}
                autoFocus
              />
              <p className="eyebrow mt-6">How should the greetings sound?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  { id: 'tw-en' as const, title: 'Twi + English', blurb: '“Maakye, Ama. How is your heart today?”' },
                  { id: 'en' as const, title: 'English only', blurb: '“Good morning, Ama. How are you feeling?”' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLanguage(option.id)}
                    className={clsx(
                      'rounded-2xl border p-3 text-left transition-colors',
                      language === option.id ? 'border-forest/40 bg-forest/6' : 'border-line bg-white/60 hover:border-sage/40',
                    )}
                  >
                    <span className="flex items-center justify-between text-[0.84rem] font-medium text-ink">
                      {option.title}
                      {language === option.id && <Check size={14} className="text-forest" />}
                    </span>
                    <span className="mt-1 block text-[0.74rem] leading-snug text-ink-muted">{option.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="anim-fade mt-6">
              <p className="eyebrow">Step three · optional</p>
              <h1 className="mt-2 font-display text-[1.7rem] leading-tight text-ink">Who should we nudge if the pattern gets concerning?</h1>
              <p className="mt-2 text-[0.86rem] leading-relaxed text-ink-muted">
                This build never sends anything. We draft the message and show it to you first — you decide, every time,
                whether it goes anywhere.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Name (e.g. Auntie Efua)"
                  className="field"
                  maxLength={50}
                />
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Phone (e.g. 024 000 0000)"
                  className="field"
                  inputMode="tel"
                  maxLength={20}
                />
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white/60 p-3">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#1F4B3F]"
                />
                <span className="text-[0.78rem] leading-relaxed text-ink-soft">
                  I understand Nkommo cannot send help, call anyone, or contact emergency services. If I am in danger I
                  will call <span className="font-medium text-ink">112</span> or{' '}
                  <span className="font-medium text-ink">0800 678 678</span>.
                </span>
              </label>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                updateSettings({ onboarded: true });
              }}
              className="btn btn-quiet text-[0.8rem]"
            >
              Skip setup
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="btn btn-ghost text-[0.82rem]">
                  Back
                </button>
              )}
              {step < 2 ? (
                <button type="button" onClick={() => setStep((s) => s + 1)} className="btn btn-primary text-[0.82rem]">
                  Continue <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finish}
                  disabled={!acknowledged}
                  className="btn btn-primary text-[0.82rem]"
                >
                  Start writing <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          {step === 0 && (
            <button
              type="button"
              onClick={() => {
                loadDemo();
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-[0.76rem] text-ink-muted hover:text-forest"
            >
              <Sparkles size={12} /> Or look around with fictional sample data first
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
