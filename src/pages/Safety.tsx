import { useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Check, ChevronRight, Copy, HeartHandshake, Phone, Plus, ShieldCheck, Trash2, Wind } from 'lucide-react';
import { useStore } from '../data/store';
import { CONVERSATION_STARTERS, COPING_TIPS, GROUNDING_STEPS, HELPLINE_NOTE, RESOURCES } from '../data/resources';
import CrisisCard from '../components/CrisisCard';
import NearestHelp from '../components/NearestHelp';
import BreathingExercise from '../components/BreathingExercise';
import { SectionHeading } from '../components/ui';

function ArrayEditor({
  label,
  hint,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...values, value]);
    setDraft('');
  };
  return (
    <div>
      <p className="text-[0.84rem] font-medium text-ink">{label}</p>
      <p className="mt-0.5 text-[0.74rem] leading-snug text-ink-muted">{hint}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="field text-[0.84rem]"
          maxLength={120}
        />
        <button type="button" onClick={add} className="btn btn-ghost shrink-0 px-3" aria-label={`Add to ${label}`}>
          <Plus size={15} />
        </button>
      </div>
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {values.map((value, index) => (
            <li
              key={`${value}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-2.5 py-1 text-[0.76rem] text-ink-soft"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="text-ink-muted hover:text-rose"
                aria-label={`Remove ${value}`}
              >
                <Trash2 size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Safety() {
  const { state, updatePlan } = useStore();
  const plan = state.safetyPlan;
  const [copied, setCopied] = useState<string | null>(null);
  const [groundStep, setGroundStep] = useState(0);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      setCopied('failed');
    }
  };

  const planIsEmpty =
    plan.warningSigns.length === 0 &&
    plan.copingSteps.length === 0 &&
    plan.people.length === 0 &&
    plan.places.length === 0 &&
    plan.reasons.length === 0;

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Safety</p>
          <h1 className="mt-2 text-balance font-display text-[2rem] leading-tight text-ink md:text-[2.5rem]">
            Help that answers, tonight.
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-ink-muted">
            You do not need to be sure it is “bad enough.” You do not need a diagnosis or a referral. These numbers are
            free and answered by people who do this work.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white/60 px-3 py-2 text-[0.7rem] leading-snug text-ink-muted">
          <p className="font-medium text-ink">In immediate danger?</p>
          <a href="tel:112" className="text-[0.95rem] font-medium text-forest">Call 112</a>
        </div>
      </div>

      <div className="mt-6">
        <CrisisCard level="urgent" />
      </div>

      {/* ---------- Resource list ---------- */}
      <section id="resources" className="mt-9 scroll-mt-24">
        <SectionHeading
          eyebrow="Ghana · verified against public sources, November 2026"
          title="People who pick up the phone"
          blurb="These are the numbers this app carries first because they are the ones most likely to answer. Re-verify before launch: numbers change."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {RESOURCES.map((resource) => (
            <a
              key={resource.id}
              href={`tel:${resource.tel}`}
              className="card group flex items-start justify-between gap-3 p-4 transition-colors hover:border-forest/30"
            >
              <div className="min-w-0">
                <p className="text-[0.66rem] uppercase tracking-[0.12em] text-ink-muted">{resource.kind}</p>
                <p className="mt-1 font-display text-[1.1rem] leading-snug text-ink">{resource.name}</p>
                <p className="mt-0.5 font-display text-[1.25rem] text-forest">{resource.contact}</p>
                <p className="mt-0.5 text-[0.72rem] text-ink-muted">{resource.hours}</p>
                <p className="mt-1.5 text-[0.78rem] leading-relaxed text-ink-soft">{resource.note}</p>
              </div>
              <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/8 text-forest transition-colors group-hover:bg-forest/12">
                <Phone size={15} />
              </span>
            </a>
          ))}
        </div>
        <p className="mt-3 text-[0.7rem] leading-relaxed text-ink-muted">{HELPLINE_NOTE}</p>
      </section>

      {/* ---------- Nearby services ---------- */}
      <section id="nearby" className="mt-8 scroll-mt-24">
        <SectionHeading
          eyebrow="Close to you"
          title="A clinic, not just a phone number."
          blurb="Ranked from a bundled list of Ghanaian mental-health services, using a location you keep on this device."
        />
        <div className="mt-4">
          <NearestHelp />
        </div>
      </section>

      {/* ---------- Safety plan ---------- */}
      <section id="plan" className="mt-10 scroll-mt-24">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="card p-5 md:p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-forest" />
              <h2 className="font-display text-[1.35rem] text-ink">Your safety plan</h2>
            </div>
            <p className="mt-1.5 text-[0.83rem] leading-relaxed text-ink-muted">
              Written when you are calm, used when you are not. A Stanley-Brown-style plan: warning signs, what helps,
              people, places, reasons. It stays on this device.
            </p>

            <div className="mt-5 space-y-5">
              <ArrayEditor
                label="1. Warning signs I recognise in myself"
                hint="How it starts: a sleep pattern, a phrase you say, a habit you drop."
                placeholder="e.g. Waking at 3am and going quiet"
                values={plan.warningSigns}
                onChange={(next) => updatePlan({ warningSigns: next })}
              />
              <ArrayEditor
                label="2. Things that help me, even a little"
                hint="Small and physical beats grand and vague."
                placeholder="e.g. Walk before the sun comes strong"
                values={plan.copingSteps}
                onChange={(next) => updatePlan({ copingSteps: next })}
              />
              <div>
                <p className="text-[0.84rem] font-medium text-ink">3. People I can reach</p>
                <p className="mt-0.5 text-[0.74rem] leading-snug text-ink-muted">
                  Name one person who listens without fixing. A phone number you would actually answer.
                </p>
                <div className="mt-2 space-y-1.5">
                  {plan.people.map((person, index) => (
                    <div key={`${person.name}-${index}`} className="flex items-center justify-between rounded-xl border border-line bg-white/60 px-3 py-2">
                      <div>
                        <p className="text-[0.84rem] text-ink">{person.name}</p>
                        <p className="text-[0.72rem] text-ink-muted">{person.phone || 'no number saved'}{person.note ? ` · ${person.note}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {person.phone && (
                          <a href={`tel:${person.phone.replace(/\s/g, '')}`} className="rounded-full p-1.5 text-forest hover:bg-forest/8" aria-label={`Call ${person.name}`}>
                            <Phone size={13} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => updatePlan({ people: plan.people.filter((_, i) => i !== index) })}
                          className="rounded-full p-1.5 text-ink-muted hover:text-rose"
                          aria-label={`Remove ${person.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <PeopleAdder onAdd={(person) => updatePlan({ people: [...plan.people, person] })} />
              </div>
              <ArrayEditor
                label="4. Places I feel safer"
                hint="Where you can go, or where you can be alone without being isolated."
                placeholder="e.g. The bench behind the church"
                values={plan.places}
                onChange={(next) => updatePlan({ places: next })}
              />
              <ArrayEditor
                label="5. Reasons to stay"
                hint="Small and specific. “My sister’s laugh” is stronger than “life is precious.”"
                placeholder="e.g. My small sister's exams next month"
                values={plan.reasons}
                onChange={(next) => updatePlan({ reasons: next })}
              />
              <div>
                <p className="text-[0.84rem] font-medium text-ink">6. Professional support I have or want</p>
                <textarea
                  value={plan.professional}
                  onChange={(e) => updatePlan({ professional: e.target.value })}
                  rows={2}
                  placeholder="e.g. Dr Mensah at Ridge, appointment 14 March. Or: ask the helpline for a facility in Tema."
                  className="field mt-2 text-[0.84rem]"
                  maxLength={400}
                />
              </div>
            </div>

            <p className="mt-5 rounded-xl bg-paper-deep/70 p-3 text-[0.72rem] leading-relaxed text-ink-muted">
              {planIsEmpty
                ? 'Nothing saved yet. Even one line here is worth more than a perfect plan you never write.'
                : 'Saved automatically in this browser. On a shared phone, remember that anyone who opens this app can read it — the privacy page explains how to export and erase.'}
            </p>
          </div>

          <div className="space-y-4">
            <div id="breathe" className="scroll-mt-24">
              <BreathingExercise />
            </div>

            <div className="card p-5">
              <p className="eyebrow">Grounding · 5-4-3-2-1</p>
              <p className="mt-2 font-display text-[2.4rem] leading-none text-forest">{GROUNDING_STEPS[groundStep].count}</p>
              <p className="text-[0.8rem] font-medium text-ink">{GROUNDING_STEPS[groundStep].sense}</p>
              <p className="mt-1.5 min-h-12 text-[0.82rem] leading-relaxed text-ink-soft">{GROUNDING_STEPS[groundStep].prompt}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGroundStep((s) => (s + 1) % GROUNDING_STEPS.length)}
                  className="btn btn-ghost px-3 py-2 text-[0.78rem]"
                >
                  {groundStep === GROUNDING_STEPS.length - 1 ? 'Start again' : 'Next sense'}
                  <ChevronRight size={13} />
                </button>
                <span className="text-[0.7rem] text-ink-muted">
                  {groundStep + 1} / {GROUNDING_STEPS.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Coping ---------- */}
      <section id="coping" className="mt-10 scroll-mt-24">
        <SectionHeading
          eyebrow="For the next twenty minutes"
          title="Things that help, when nothing helps."
          blurb="Not cures. Interruptions. Pick one and do it badly."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {COPING_TIPS.map((tip) => (
            <div key={tip.id} className="card p-5">
              <div className="flex items-center gap-2">
                <Wind size={15} className="text-sage" />
                <h3 className="font-display text-[1.1rem] text-ink">{tip.title}</h3>
                <span className="ml-auto text-[0.68rem] text-ink-muted">{tip.minutes} min</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {tip.body.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[0.83rem] leading-relaxed text-ink-soft">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sage" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Help a friend ---------- */}
      <section id="someone" className="mt-10 scroll-mt-24">
        <div className="rounded-3xl border border-line bg-white/55 p-5 md:p-8">
          <div className="grid gap-7 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="eyebrow">Someone you love</p>
              <h2 className="mt-2 text-balance font-display text-[1.7rem] leading-tight text-ink">
                How to talk to a friend who is not okay.
              </h2>
              <div className="mt-4 space-y-3">
                {[
                  { title: 'Ask straight', body: '“I have noticed you are not yourself. Are you thinking about hurting yourself?” Asking does not plant the idea. It usually opens a door.' },
                  { title: 'Stay, do not fix', body: '“That sounds really heavy.” Silence is allowed. You are not a therapist and you do not need to be one.' },
                  { title: 'Take it seriously', body: 'If they mention a plan, a date, or having the means, help them get to a person now. Call 112 if there is immediate danger.' },
                  { title: 'Do not promise secrecy', body: '“I will not tell anyone” is a promise that can cost a life. Say: “I care about you too much to keep this alone.”' },
                  { title: 'Follow up', body: 'A message two days later matters more than a perfect conversation today.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-2">
                    <Check size={13} className="mt-1 shrink-0 text-forest" />
                    <p className="text-[0.84rem] leading-relaxed text-ink-soft">
                      <span className="font-medium text-ink">{item.title}. </span>
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">Say it like this</p>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-ink-muted">
                Tap to copy. These are written to be sent as-is, awkwardness included.
              </p>
              <div className="mt-3 space-y-2">
                {CONVERSATION_STARTERS.map((line, index) => (
                  <button
                    key={line}
                    type="button"
                    onClick={() => copy(line, `line-${index}`)}
                    className="group flex w-full items-start justify-between gap-3 rounded-xl border border-line bg-paper/70 px-3 py-2.5 text-left transition-colors hover:border-sage/50"
                  >
                    <span className="text-[0.82rem] leading-relaxed text-ink-soft">“{line}”</span>
                    {copied === `line-${index}` ? (
                      <Check size={13} className="mt-0.5 shrink-0 text-sage" />
                    ) : (
                      <Copy size={12} className="mt-0.5 shrink-0 text-ink-muted group-hover:text-forest" />
                    )}
                  </button>
                ))}
                {copied === 'failed' && (
                  <p className="text-[0.7rem] text-rose">Clipboard blocked by the browser. Select the text and copy manually.</p>
                )}
              </div>
              <div className="mt-4 rounded-xl bg-paper-deep/70 p-3">
                <p className="flex items-center gap-1.5 text-[0.76rem] font-medium text-ink">
                  <HeartHandshake size={13} className="text-clay" /> If you are the one who is not okay
                </p>
                <p className="mt-1 text-[0.74rem] leading-relaxed text-ink-soft">
                  You are allowed to be the person who needs help today. Send one of these to the person who feels safest,
                  or call the helpline. Both count as strength, not failure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-5 text-[0.78rem]">
        <span className="text-ink-muted">Nkommo cannot call for you. It can only make the call easier to make.</span>
        <Link to="/trusted" className={clsx('btn btn-ghost text-[0.8rem]')}>
          Set up a trusted contact
        </Link>
      </div>
    </div>
  );
}

function PeopleAdder({ onAdd }: { onAdd: (person: { name: string; phone: string; note?: string }) => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  return (
    <div className="mt-2 grid grid-cols-[1.2fr_1fr_auto] gap-1.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="field px-2.5 py-1.5 text-[0.8rem]" maxLength={50} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" inputMode="tel" className="field px-2.5 py-1.5 text-[0.8rem]" maxLength={20} />
      <button
        type="button"
        onClick={() => {
          if (!name.trim()) return;
          onAdd({ name: name.trim(), phone: phone.trim() });
          setName('');
          setPhone('');
        }}
        className="btn btn-ghost px-2.5"
        aria-label="Add person"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
