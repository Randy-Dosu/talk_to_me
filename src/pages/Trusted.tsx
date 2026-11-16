import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { BellRing, Check, Copy, Info, Lock, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { useStore } from '../data/store';
import { concernScore, detectPatterns, weeklyAverages } from '../engine/trends';
import { formatDay } from '../engine/id';
import { SectionHeading, Toggle } from '../components/ui';

function buildPreview(name: string, patterns: ReturnType<typeof detectPatterns>, week: ReturnType<typeof weeklyAverages>) {
  const concerns = patterns.filter((p) => p.tone === 'concern' || p.tone === 'notice').slice(0, 2);
  return [
    `Hi ${name}, this is a check-in from Nkommo (sent on behalf of your person, with their permission).`,
    '',
    `They have not written much that sounds like themselves this week. Their mood readings averaged ${
      week.thisWeek ?? '—'
    }/100 over ${week.thisCount} entries, ${week.delta === null ? 'with no prior week to compare' : week.delta < 0 ? `down ${Math.abs(week.delta)} points from last week` : `up ${week.delta} points from last week`}.`,
    ...(concerns.length ? ['', 'What the pattern shows:', ...concerns.map((p) => `• ${p.title}`)] : []),
    '',
    'No journal text is included, ever. If you can, call them and ask how they really are. If you think they are in immediate danger, call 112.',
    '',
    '— Nkommo · this is not an emergency service',
  ].join('\n');
}

const RELATIONSHIPS = ['Friend', 'Sister / brother', 'Parent', 'Aunt / uncle', 'Partner', 'Pastor / imam', 'Colleague', 'Counsellor'];

export default function Trusted() {
  const { state, updateSettings, addAlert, dismissAlert } = useStore();
  const trusted = state.settings.trusted;
  const patterns = useMemo(() => detectPatterns(state.entries, state.checkins), [state.entries, state.checkins]);
  const week = weeklyAverages(state.entries);
  const concerns = concernScore(patterns);
  const eligible = concerns >= 3 && Boolean(trusted?.enabled);

  const [name, setName] = useState(trusted?.name ?? '');
  const [relationship, setRelationship] = useState(trusted?.relationship ?? 'Friend');
  const [phone, setPhone] = useState(trusted?.phone ?? '');
  const [consented, setConsented] = useState(Boolean(trusted?.enabled));
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const preview = useMemo(
    () => buildPreview(trusted?.name || name || 'friend', patterns, week),
    [trusted?.name, name, patterns, week],
  );

  const save = (enabled: boolean) => {
    const contactName = name.trim();
    if (!contactName) return;
    updateSettings({
      trusted: {
        name: contactName,
        relationship,
        phone: phone.trim(),
        enabled,
        escalateAfterDays: 3,
        shareJournals: false,
      },
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="container-page max-w-4xl py-8 lg:py-10">
      <SectionHeading
        eyebrow="Trusted circle"
        title="A person, not an algorithm, for the worst day."
        blurb="Opt in to a check-in message that goes to someone you name — but only after sustained evidence, and never with your journal text attached."
      />

      <div className="mt-5 rounded-2xl border border-gold/30 bg-gold/8 p-4">
        <p className="flex items-center gap-2 text-[0.82rem] font-medium text-[#7a5a10]">
          <Info size={14} /> This build is a dry run — nothing is actually sent
        </p>
        <p className="mt-1.5 text-[0.79rem] leading-relaxed text-[#6f5310]">
          Drafting and delivery need an encrypted relay, consent records, and a human escalation policy. Until that exists,
          Nkommo drafts the message and shows it to you. If you want to send it today, copy it and send it yourself — that
          still works.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-forest" />
            <h2 className="font-display text-[1.25rem] text-ink">
              {trusted ? 'Your trusted contact' : 'Add a trusted contact'}
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[0.74rem] font-medium text-ink" htmlFor="contact-name">Name</label>
              <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" className="field mt-1" maxLength={60} />
            </div>
            <div>
              <label className="text-[0.74rem] font-medium text-ink" htmlFor="contact-relationship">Relationship</label>
              <select
                id="contact-relationship"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="field mt-1"
              >
                {RELATIONSHIPS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[0.74rem] font-medium text-ink" htmlFor="contact-phone">Phone number</label>
              <input
                id="contact-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+233 24 000 0000"
                inputMode="tel"
                className="field mt-1"
                maxLength={24}
              />
              <p className="mt-1 text-[0.68rem] text-ink-muted">Stored on this device only. Not used until delivery exists.</p>
            </div>
          </div>

          <div className="mt-4 border-t border-line/70 pt-3">
            <Toggle
              checked={consented}
              onChange={setConsented}
              label="I have asked this person, and they agreed"
              description="Consent matters. An unexpected message about someone’s mental health can do harm — ask first, in your own words."
            />
            <div className="flex items-start justify-between gap-4 py-3">
              <span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Lock size={12} className="text-ink-muted" /> Include journal text in alerts
                </span>
                <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-muted">
                  Not available, by design. No setting can turn this on.
                </span>
              </span>
              <span className="mt-0.5 rounded-full border border-line bg-paper-deep px-2 py-0.5 text-[0.66rem] uppercase tracking-[0.08em] text-ink-muted">
                never
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => save(true)}
              disabled={!name.trim() || !consented}
              className="btn btn-primary text-[0.8rem]"
            >
              <Check size={13} /> Save trusted contact
            </button>
            {trusted && (
              <button
                type="button"
                onClick={() => updateSettings({ trusted: null })}
                className="btn btn-quiet text-[0.78rem] text-rose"
              >
                Remove
              </button>
            )}
            {saved && <span className="text-[0.72rem] text-sage">Saved on this device.</span>}
          </div>

          <div className="mt-4 rounded-xl bg-paper-deep/70 p-3 text-[0.72rem] leading-relaxed text-ink-soft">
            <p className="flex items-center gap-1.5 font-medium text-ink">
              <ShieldCheck size={12} className="text-forest" /> What would trigger a draft
            </p>
            <p className="mt-1">
              Three converging signals in ten days — low mood plus poor sleep plus withdrawal, for example. One bad day
              never triggers it. Evidence now: <span className="font-medium text-ink">{concerns}</span>/3.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className={clsx('rounded-3xl border p-5', eligible ? 'border-clay/30 bg-clay/5' : 'border-line bg-white/60')}>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Draft message · never auto-sent</p>
              <BellRing size={14} className={eligible ? 'text-clay' : 'text-ink-muted'} />
            </div>
            <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-paper/80 p-3 font-sans text-[0.78rem] leading-relaxed text-ink-soft">
              {preview}
            </pre>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  addAlert(
                    eligible ? 'Sustained concerning pattern' : 'Manual preview',
                    preview,
                  );
                }}
                className="btn btn-clay text-[0.8rem]"
              >
                <Send size={13} /> Save as draft
              </button>
              <button type="button" onClick={copyPreview} className="btn btn-ghost text-[0.8rem]">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <span className="ml-auto inline-flex items-center gap-1 text-[0.68rem] text-ink-muted">
                <Lock size={10} /> no journal text
              </span>
            </div>
            {!eligible && (
              <p className="mt-2 text-[0.7rem] leading-relaxed text-ink-muted">
                The pattern does not meet the bar yet. That is the system working as intended — alerts should be rare.
              </p>
            )}
          </div>

          <div className="card p-5">
            <p className="eyebrow">Your drafts</p>
            {state.alerts.length === 0 ? (
              <p className="mt-2 text-[0.8rem] text-ink-muted">No drafts saved. Nothing has left this device.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {state.alerts.map((alert) => (
                  <li key={alert.id} className="rounded-xl border border-line bg-white/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[0.78rem] font-medium text-ink">{alert.trigger}</p>
                      <span className="text-[0.66rem] text-ink-muted">{formatDay(alert.createdAt)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[0.72rem] leading-relaxed text-ink-muted">{alert.preview}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[0.64rem] uppercase tracking-[0.08em] text-ink-muted">
                        {alert.status} · preview only
                      </span>
                      {alert.status === 'drafted' && (
                        <button
                          type="button"
                          onClick={() => dismissAlert(alert.id)}
                          className="text-[0.7rem] text-rose hover:underline"
                        >
                          Discard
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white/50 p-4">
            <p className="flex items-center gap-1.5 text-[0.78rem] font-medium text-ink">
              <Lock size={12} className="text-forest" /> Boundaries any delivery build must hold
            </p>
            <p className="mt-1.5 text-[0.74rem] leading-relaxed text-ink-muted">
              Nothing is sent in this build. The version that can send must hold these:
            </p>
            <ul className="mt-2 space-y-1 text-[0.75rem] leading-relaxed text-ink-soft">
              <li>· No journal text, ever.</li>
              <li>· No delivery 22:00–07:00.</li>
              <li>· One message per 24 hours, never two without approval.</li>
              <li>· Revoking consent deletes contact and drafts.</li>
            </ul>
            <Link to="/privacy" className="mt-2 inline-block text-[0.74rem] font-medium text-forest">
              How data is handled →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
