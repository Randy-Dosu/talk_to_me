import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Lock, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import { useStore } from '../data/store';
import { Mark } from '../components/Logo';

/**
 * Everything Nkommo needs lives on one page. Nothing is asked again inside the
 * chat — the chat is only for writing.
 */
export default function Signup() {
  const { state, updateSettings, updatePlan } = useStore();
  const navigate = useNavigate();
  const [alias, setAlias] = useState(state.settings.displayName);
  const [language, setLanguage] = useState<'en' | 'tw-en'>(state.settings.language);
  const [contactName, setContactName] = useState(state.settings.trusted?.name ?? '');
  const [contactPhone, setContactPhone] = useState(state.settings.trusted?.phone ?? '');
  const [consented, setConsented] = useState(Boolean(state.settings.trusted?.enabled));
  const [acknowledged, setAcknowledged] = useState(state.settings.onboarded);
  const [showErrors, setShowErrors] = useState(false);

  const nameOk = alias.trim().length > 0;
  const contactOk = !contactName.trim() || consented;
  const ready = nameOk && acknowledged && contactOk;

  const start = () => {
    if (!ready) {
      setShowErrors(true);
      return;
    }
    const contact = contactName.trim();
    updateSettings({
      displayName: alias.trim(),
      language,
      onboarded: true,
      trusted: contact
        ? {
            name: contact,
            relationship: 'Trusted contact',
            phone: contactPhone.trim(),
            enabled: true,
            escalateAfterDays: 3,
            shareJournals: false,
          }
        : state.settings.trusted,
    });
    if (contact) {
      updatePlan({ people: [{ name: contact, phone: contactPhone.trim(), note: 'Added at signup' }] });
    }
    navigate('/journal');
  };

  const skip = () => {
    updateSettings({ onboarded: true, displayName: alias.trim() || 'friend', language });
    navigate('/journal');
  };

  return (
    <div className="container-page flex min-h-[calc(100dvh-4rem)] items-center justify-center py-8">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <Mark size={34} />
          <div>
            <p className="eyebrow">Signup · akwaaba</p>
            <h1 className="font-display text-[1.7rem] leading-tight text-ink">Set up in one page.</h1>
          </div>
        </div>

        <div className="card p-5 md:p-6">
          {/* 1. name */}
          <label htmlFor="alias" className="block text-[0.82rem] font-medium text-ink">
            What should I call you?
          </label>
          <p className="mt-0.5 text-[0.74rem] text-ink-muted">An alias is fine. It never leaves this device.</p>
          <input
            id="alias"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Auntie Ama, Kofi, or just “friend”"
            maxLength={40}
            autoComplete="off"
            className="field mt-2 w-full"
            aria-invalid={showErrors && !nameOk}
          />
          {showErrors && !nameOk && <p className="mt-1 text-[0.72rem] text-rose">Put something here — any name works.</p>}

          {/* 2. language */}
          <p className="mt-5 text-[0.82rem] font-medium text-ink">How do you write?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { id: 'en' as const, label: 'English', hint: 'Standard' },
              { id: 'tw-en' as const, label: 'English + Twi', hint: 'Mixed, as you speak' },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setLanguage(option.id)}
                aria-pressed={language === option.id}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  language === option.id ? 'border-forest bg-forest/8' : 'border-line bg-white/60 hover:border-sage/40'
                }`}
              >
                <span className="flex items-center justify-between text-[0.84rem] font-medium text-ink">
                  {option.label}
                  {language === option.id && <Check size={13} className="text-forest" />}
                </span>
                <span className="text-[0.7rem] text-ink-muted">{option.hint}</span>
              </button>
            ))}
          </div>

          {/* 3. trusted contact */}
          <div className="mt-5 flex items-center gap-1.5">
            <UserPlus size={14} className="text-forest" />
            <p className="text-[0.82rem] font-medium text-ink">Someone we can nudge</p>
            <span className="ml-auto text-[0.66rem] uppercase tracking-[0.08em] text-ink-muted">optional</span>
          </div>
          <p className="mt-0.5 text-[0.74rem] leading-snug text-ink-muted">
            Only ever a draft you approve. Never sent by this build.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Their name"
              maxLength={50}
              className="field"
              aria-label="Trusted contact name"
            />
            <input
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="Their phone"
              inputMode="tel"
              maxLength={20}
              className="field"
              aria-label="Trusted contact phone"
            />
          </div>
          {contactName.trim().length > 0 && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-[0.76rem] leading-snug text-ink-soft">
              <input
                type="checkbox"
                checked={consented}
                onChange={(event) => setConsented(event.target.checked)}
                className="mt-0.5 accent-forest"
              />
              They have agreed to be contacted. Consent matters — an unexpected message about someone’s mental health
              can do harm.
            </label>
          )}
          {showErrors && !contactOk && <p className="mt-1 text-[0.72rem] text-rose">Ask them first, then tick the box.</p>}

          {/* 4. acknowledgement */}
          <label className="mt-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-paper-deep/40 p-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 accent-forest"
            />
            <span className="text-[0.78rem] leading-snug text-ink-soft">
              I understand Nkommo is a screening aid — <span className="font-medium text-ink">not a diagnosis</span>, and
              not an emergency service.
            </span>
          </label>
          {showErrors && !acknowledged && (
            <p className="mt-1 text-[0.72rem] text-rose">Tick this to continue.</p>
          )}

          <button type="button" onClick={start} disabled={!ready} className="btn btn-primary mt-4 w-full py-3 text-[0.9rem]">
            Start writing <ArrowRight size={15} />
          </button>

          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" onClick={skip} className="text-[0.76rem] text-ink-muted underline decoration-line underline-offset-2 hover:text-forest">
              Skip for now
            </button>
            <span className="inline-flex items-center gap-1 text-[0.68rem] text-ink-muted">
              <Lock size={10} /> stored in this browser only
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose/20 bg-rose/5 px-3.5 py-2.5 text-[0.76rem]">
          <span className="inline-flex items-center gap-1.5 text-ink-soft">
            <ShieldCheck size={13} className="text-rose" /> In danger now?
          </span>
          <span className="flex items-center gap-3">
            <a href="tel:112" className="font-medium text-rose">
              112
            </a>
            <a href="tel:0800678678" className="inline-flex items-center gap-1 font-medium text-forest">
              <Phone size={12} /> 0800 678 678
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
