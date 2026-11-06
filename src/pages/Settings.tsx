import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BrainCircuit, Check, KeyRound, Lock, MapPin, ShieldAlert, Sunrise, Sunset, X } from 'lucide-react';
import NearestHelp from '../components/NearestHelp';
import { SectionHeading } from '../components/ui';
import { useStore } from '../data/store';
import { DEFAULT_HF_MODEL, getHfToken, setHfToken, testHfConnection } from '../lib/hfChat';
import { formatClock } from '../lib/dayPrompter';
import { useNotificationPermission } from '../lib/useReminders';

export default function Settings() {
  const { state, updateSettings } = useStore();
  const notifications = useNotificationPermission();
  const [model, setModel] = useState(state.settings.ai.model || DEFAULT_HF_MODEL);
  const [token, setToken] = useState(getHfToken());
  const [consent, setConsent] = useState(state.settings.ai.enabled);
  const [test, setTest] = useState<{ state: 'idle' | 'testing' | 'ok' | 'fail'; message?: string }>({ state: 'idle' });

  const enabled = state.settings.ai.enabled;

  const saveToken = (value: string) => {
    setToken(value);
    // Session storage only: closing the tab forgets the token.
    setHfToken(value);
  };

  const connect = () => {
    setHfToken(token);
    updateSettings({ ai: { enabled: consent, model: model.trim() || DEFAULT_HF_MODEL } });
  };

  const runTest = async () => {
    setTest({ state: 'testing' });
    const result = await testHfConnection(model.trim() || DEFAULT_HF_MODEL, token);
    setTest({ state: result.ok ? 'ok' : 'fail', message: result.error });
  };

  return (
    <div className="container-page max-w-3xl py-8 lg:py-10">
      <SectionHeading
        eyebrow="Settings"
        title="Two optional things."
        blurb="Neither is needed to use the journal. Both stay on this device unless you turn them on."
      />

      {/* ---------- daily prompts ---------- */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <Sunrise size={15} className="text-forest" />
          <h2 className="font-display text-[1.2rem] text-ink">Daily prompts</h2>
        </div>
        <p className="mb-3 max-w-xl text-[0.84rem] leading-relaxed text-ink-muted">
          One question in the morning, one at night. Psychological starters, not pep talks.
        </p>

        <div className="card p-5">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span>
              <span className="block text-[0.86rem] font-medium text-ink">Show the prompter</span>
              <span className="mt-0.5 block text-[0.76rem] leading-snug text-ink-muted">
                An in-app card at the top of the chat during the morning and evening windows.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-checked={state.settings.remindersEnabled}
              aria-label="Show the prompter"
              checked={state.settings.remindersEnabled}
              onChange={(event) => updateSettings({ remindersEnabled: event.target.checked })}
              className="mt-1 h-5 w-5 accent-forest"
            />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-ink">
                <Sunrise size={12} className="text-[#8a6414]" /> Morning plan
              </span>
              <input
                type="time"
                value={state.settings.morningTime}
                onChange={(event) => updateSettings({ morningTime: event.target.value })}
                className="field mt-1.5 w-full text-[0.84rem]"
              />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-[0.78rem] font-medium text-ink">
                <Sunset size={12} className="text-forest" /> Evening check-in
              </span>
              <input
                type="time"
                value={state.settings.eveningTime}
                onChange={(event) => updateSettings({ eveningTime: event.target.value })}
                className="field mt-1.5 w-full text-[0.84rem]"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void notifications.requestPermission()}
              disabled={!notifications.supported || notifications.permission === 'granted'}
              className="btn btn-ghost px-3 py-2 text-[0.8rem]"
            >
              <Bell size={13} />
              {notifications.permission === 'granted'
                ? 'Notifications on'
                : notifications.permission === 'denied'
                  ? 'Notifications blocked'
                  : notifications.permission === 'unsupported'
                    ? 'Notifications unavailable'
                    : 'Turn on notifications'}
            </button>
            <span className="text-[0.7rem] leading-snug text-ink-muted">
              {formatClock(state.settings.morningTime)} · {formatClock(state.settings.eveningTime)}, local time
            </span>
          </div>

          <p className="mt-3 text-[0.7rem] leading-relaxed text-ink-muted">
            No push service, no account — fires only while this tab is open. The notification is a question, never your
            entries. If blocked, the card still shows in the chat.
          </p>
        </div>
      </section>

      {/* ---------- location ---------- */}
      <section className="mt-8">
        <div className="mb-2 flex items-center gap-2">
          <MapPin size={15} className="text-forest" />
          <h2 className="font-display text-[1.2rem] text-ink">Location for nearby clinics</h2>
        </div>
        <p className="mb-3 max-w-xl text-[0.84rem] leading-relaxed text-ink-muted">
          Used once, on this device, to rank the nearest mental-health services. Coordinates are never sent anywhere —
          the distance is calculated in the browser against a list that ships with the app.
        </p>
        <NearestHelp />
      </section>

      {/* ---------- conversation model ---------- */}
      <section className="mt-10">
        <div className="mb-2 flex items-center gap-2">
          <BrainCircuit size={15} className="text-forest" />
          <h2 className="font-display text-[1.2rem] text-ink">Conversation model</h2>
          <span className="rounded-full border border-line px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.08em] text-ink-muted">
            optional
          </span>
        </div>
        <p className="mb-3 max-w-xl text-[0.84rem] leading-relaxed text-ink-muted">
          By default the reply under your entry is written on this device from the reading — short reflections, no
          advice. You can route replies through a Hugging Face chat model instead.
        </p>

        <div className="card p-5">
          <label htmlFor="hf-model" className="text-[0.8rem] font-medium text-ink">
            Model id
          </label>
          <input
            id="hf-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={DEFAULT_HF_MODEL}
            className="field mt-1.5 w-full text-[0.84rem]"
            spellCheck={false}
          />
          <p className="mt-1 text-[0.7rem] text-ink-muted">
            Any chat-completions model your token can reach. A mental-health-tuned model is not automatically safer —
            read the model card before trusting one with this.
          </p>

          <label htmlFor="hf-token" className="mt-4 block text-[0.8rem] font-medium text-ink">
            Access token
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="hf-token"
              type="password"
              value={token}
              onChange={(event) => saveToken(event.target.value)}
              placeholder="hf_…"
              autoComplete="off"
              className="field w-full text-[0.84rem]"
            />
            <button type="button" onClick={runTest} className="btn btn-ghost shrink-0 px-3 text-[0.78rem]">
              Test
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[0.7rem]">
            <span className="inline-flex items-center gap-1.5 text-ink-muted">
              <KeyRound size={10} /> kept in this tab only
            </span>
            {test.state === 'testing' && <span className="text-ink-muted">Testing…</span>}
            {test.state === 'ok' && (
              <span className="inline-flex items-center gap-1 text-[#456b4b]">
                <Check size={11} /> Reachable
              </span>
            )}
            {test.state === 'fail' && (
              <span className="inline-flex items-center gap-1 text-rose">
                <X size={11} /> {test.message}
              </span>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-gold/30 bg-gold/8 p-3">
            <p className="flex items-center gap-1.5 text-[0.78rem] font-medium text-[#6f5310]">
              <ShieldAlert size={13} /> Turning this on changes the privacy promise
            </p>
            <ul className="mt-1.5 space-y-1 text-[0.74rem] leading-relaxed text-[#6f5310]/90">
              <li>· Your entry text leaves this device and is processed by Hugging Face.</li>
              <li>· High-risk entries are never sent. They stay local and open the crisis card.</li>
              <li>· Replies are filtered for diagnostic claims and capped at three sentences.</li>
              <li>· The token is kept in session storage, so closing the tab forgets it.</li>
            </ul>
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2 text-[0.78rem] leading-snug text-ink-soft">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 accent-forest" />
            I understand, and I want replies from the model when it is reachable.
          </label>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={connect} disabled={!token || (!enabled && !consent)} className="btn btn-primary text-[0.82rem]">
              {enabled ? 'Update' : 'Turn on model replies'}
            </button>
            {enabled && (
              <button
                type="button"
                onClick={() => {
                  setConsent(false);
                  updateSettings({ ai: { ...state.settings.ai, enabled: false } });
                  setHfToken('');
                  setToken('');
                }}
                className="btn btn-ghost text-[0.8rem]"
              >
                Turn off and forget token
              </button>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[0.68rem] text-ink-muted">
              {enabled ? <KeyRound size={10} /> : <Lock size={10} />}
              {enabled ? 'on · entries may leave the device' : 'off · everything stays here'}
            </span>
          </div>

          {enabled && !token && (
            <p className="mt-2 text-[0.72rem] text-rose">
              On, but no token in this tab. Replies will fall back to the on-device reading.
            </p>
          )}
        </div>

        <p className="mt-3 text-[0.72rem] leading-relaxed text-ink-muted">
          If the model is unreachable (this preview sandbox has no outbound network), the reply falls back to the
          on-device reading and says so. Nothing is retried in the background. See{' '}
          <Link to="/model" className="underline decoration-line underline-offset-2 hover:text-forest">
            the model card
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline decoration-line underline-offset-2 hover:text-forest">
            privacy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
