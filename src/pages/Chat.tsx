import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  Activity,
  ArrowUp,
  ChevronDown,
  LifeBuoy,
  LineChart,
  Mic,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import CrisisCard from '../components/CrisisCard';
import DayPrompter from '../components/DayPrompter';
import AnalysisPanel from '../components/AnalysisPanel';
import VoiceSheet from '../components/VoiceSheet';
import { Mark } from '../components/Logo';
import { MoodBadge } from '../components/ui';
import { useStore, useSortedEntries } from '../data/store';
import { getHfToken, hfReply, maySendToModel, usingProxy } from '../lib/hfChat';
import { dayKey, formatDay, formatTime } from '../engine/id';
import { questionFor } from '../data/prompts';
import { dismiss, isDismissed, periodLabel, periodOfDay, promptWindow } from '../lib/dayPrompter';
import { useNotificationPermission } from '../lib/useReminders';
import { bandChip } from '../lib/tone';
import type { JournalEntry, MoodBand } from '../engine/types';

const BANDS: MoodBand[] = ['heavy', 'unsettled', 'steady', 'bright'];

interface ReplyState {
  status: 'thinking' | 'ready';
  text: string;
  source: 'local' | 'hf';
  note?: string;
  /** The model that actually answered, which may be a fallback. */
  model?: string;
}

function reflection(entry: JournalEntry): string {
  const { risk, moodBand, distress } = entry.analysis;
  if (risk.level === 'urgent') {
    return 'I am glad you put that in words. This sounds like real danger, and it is bigger than an app — please talk to a person now. The numbers below answer.';
  }
  if (risk.level === 'elevated') {
    return 'That reads heavier than a bad day. Please say it to a person today; the numbers below are free and answered.';
  }
  if (risk.subject === 'other') {
    return 'This sounds like it is about someone else, so your own pattern stays clear. Here is how to help them.';
  }
  if (risk.level === 'watch') {
    return 'I am reading something worth watching — not an alarm, but worth saying out loud to someone.';
  }
  if (distress >= 65) {
    return 'That sounds like a heavy day. Thank you for saying it here instead of carrying it alone.';
  }
  if (moodBand === 'heavy') return 'A heavy one. Noted, gently.';
  if (moodBand === 'unsettled') return 'A mixed day, by the sound of it.';
  if (moodBand === 'bright') return 'Good to read that. Kept.';
  return 'Steady, with some weight in it. Kept.';
}

export default function Chat() {
  const { state, addEntry, removeEntry, setFeltMood, updateSettings } = useStore();
  const entries = useSortedEntries();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [openWhy, setOpenWhy] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, ReplyState>>({});
  const [promptDismissed, setPromptDismissed] = useState(false);
  const now = new Date();
  const hour = now.getHours();
  const slotPrompt = promptWindow(now);
  const promptKind = slotPrompt ?? (hour < 17 ? 'morning' : 'evening');
  const reminders = useNotificationPermission();
  const lastQuestion = useRef<string | null>(
    typeof window === 'undefined' ? null : window.localStorage.getItem('nkommo.lastQuestion'),
  );
  // Re-ask only when the window or the entries change — not on every render.
  const questionSignature = `${promptKind}:${entries.length}:${entries[0]?.id ?? 'none'}:${hour}`;
  const question = useMemo(
    () =>
      state.settings.onboarded
        ? questionFor({ kind: promptKind, entries, now }, lastQuestion.current ?? undefined)
        : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questionSignature, state.settings.onboarded],
  );
  useEffect(() => {
    if (!question) return;
    lastQuestion.current = question;
    try {
      window.localStorage.setItem('nkommo.lastQuestion', question);
    } catch {
      // private mode: the question is still asked, it just may repeat
    }
  }, [question]);
  const showPrompter = Boolean(slotPrompt) && state.settings.remindersEnabled && !promptDismissed && !isDismissed(promptKind, now);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    for (const entry of entries) {
      const key = dayKey(entry.createdAt);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return [...map.entries()].map(([key, list]) => ({
      key,
      label: key === dayKey(new Date()) ? 'Today' : formatDay(list[0].createdAt, { weekday: 'short', day: 'numeric', month: 'short' }),
      entries: [...list].reverse(),
      mood: list[0].feltMood ?? list[0].analysis.moodBand,
    }));
  }, [entries]);

  const visible = useMemo(() => {
    // Chat reads oldest to newest; the sidebar keeps newest first.
    const flat = [...days].reverse().flatMap((day) => day.entries);
    return filter ? flat.filter((entry) => dayKey(entry.createdAt) === filter) : flat;
  }, [days, filter]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [visible.length, filter]);

  if (!state.settings.onboarded) return <Navigate to="/signup" replace />;

  const name = state.settings.displayName || 'friend';

  const send = async () => {
    const entry = addEntry(text, usedVoice ? 'voice' : 'typed');
    if (!entry) return;
    setText('');
    setUsedVoice(false);
    setFilter(null);
    inputRef.current?.focus();

    const token = getHfToken();
    if (!state.settings.ai.enabled || (!token && !usingProxy())) return;
    if (!maySendToModel(entry.analysis, entry.text)) return;

    setReplies((prev) => ({
      ...prev,
      [entry.id]: { status: 'thinking', text: '', source: 'hf' },
    }));
    const result = await hfReply({
      text: entry.text,
      analysis: entry.analysis,
      model: state.settings.ai.model,
      token,
    });
    if (result.ok && result.model && result.model !== state.settings.ai.model) {
      // Remember the model that answered, so the next reply does not retry a dead id.
      updateSettings({ ai: { ...state.settings.ai, model: result.model } });
    }
    setReplies((prev) => ({
      ...prev,
      [entry.id]: result.ok
        ? { status: 'ready', text: result.text, source: 'hf', model: result.model }
        : {
            status: 'ready',
            text: reflection(entry),
            source: 'local',
            note: result.error ?? 'The model did not answer.',
          },
    }));
  };

  return (
    <>
      <div className="container-page py-4 lg:py-6">
        <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
          {/* -------- days sidebar -------- */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <button
                type="button"
                onClick={() => {
                  setFilter(null);
                  inputRef.current?.focus();
                }}
                className="btn btn-primary w-full py-2.5 text-[0.82rem]"
              >
                <Sparkles size={14} /> New entry
              </button>

              <div>
                <p className="eyebrow mb-2">Your days</p>
                <ul className="space-y-0.5">
                  {days.length === 0 && <li className="px-2 py-1.5 text-[0.78rem] text-ink-muted">No days yet.</li>}
                  {days.slice(0, 12).map((day) => (
                    <li key={day.key}>
                      <button
                        type="button"
                        onClick={() => setFilter(filter === day.key ? null : day.key)}
                        className={clsx(
                          'flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[0.8rem] transition-colors',
                          filter === day.key ? 'bg-forest/10 text-forest' : 'text-ink-soft hover:bg-ink/5',
                        )}
                      >
                        <span className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', bandChip[day.mood].dot)} />
                        <span className="truncate">{day.label}</span>
                        <span className="ml-auto text-[0.68rem] text-ink-muted">{day.entries.length}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 border-t border-line/70 pt-3 text-[0.78rem]">
                <Link to="/patterns" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink-soft hover:bg-ink/5">
                  <LineChart size={14} /> Patterns
                </Link>
                <Link to="/check-in" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink-soft hover:bg-ink/5">
                  <Activity size={14} /> Check-in
                </Link>
                <Link to="/safety" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink-soft hover:bg-ink/5">
                  <LifeBuoy size={14} /> Safety
                </Link>
                <Link to="/settings" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-ink-soft hover:bg-ink/5">
                  <Settings2 size={14} /> Settings
                </Link>
              </div>
            </div>
          </aside>

          {/* -------- conversation -------- */}
          <section className="mx-auto flex min-h-[calc(100dvh-9rem)] w-full max-w-3xl flex-col">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-2.5">
              <div>
                <h1 className="font-display text-[1.2rem] leading-tight text-ink">
                  {periodLabel(periodOfDay(now))}, {name}
                </h1>
              </div>
              {days.length > 1 && (
                <select
                  value={filter ?? ''}
                  onChange={(event) => setFilter(event.target.value || null)}
                  aria-label="Filter by day"
                  className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-[0.76rem] text-ink-soft lg:hidden"
                >
                  <option value="">All days</option>
                  {days.map((day) => (
                    <option key={day.key} value={day.key}>
                      {day.label}
                    </option>
                  ))}
                </select>
              )}
            </header>

            {showPrompter && slotPrompt && (
              <div className="pt-4">
                <DayPrompter
                  kind={slotPrompt}
                  question={question}
                  permission={reminders.permission}
                  onEnableNotifications={() => {
                    void reminders.requestPermission();
                  }}
                  onStart={() => inputRef.current?.focus()}
                  onDismiss={() => {
                    dismiss(slotPrompt, now);
                    setPromptDismissed(true);
                  }}
                />
              </div>
            )}

            <div role="log" aria-live="polite" aria-label="Conversation" className="flex-1 space-y-6 py-5">
              {visible.length === 0 && (
                <div className="max-w-lg">
                  <div className="flex items-start gap-3">
                    <Mark size={26} />
                    <div className="rounded-2xl rounded-tl-md bg-white/70 px-4 py-3">
                      {!showPrompter && (
                        <p className="text-[0.95rem] leading-relaxed text-ink">{question}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {visible.map((entry) => {
                const risky = entry.analysis.risk.level === 'urgent' || entry.analysis.risk.level === 'elevated';
                const shownBand = entry.feltMood ?? entry.analysis.moodBand;
                return (
                  <div key={entry.id} className="anim-fade space-y-2.5">
                    {/* user */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-forest px-3.5 py-2.5 text-paper">
                        <p className="whitespace-pre-wrap text-[0.92rem] leading-relaxed">{entry.text}</p>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[0.64rem] text-paper/60">
                          {entry.source === 'voice' && (
                            <span className="inline-flex items-center gap-1">
                              <Mic size={9} /> spoken
                            </span>
                          )}
                          <span>{formatTime(entry.createdAt)}</span>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(entry.id)}
                            className="rounded p-0.5 hover:text-paper"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {confirmDelete === entry.id && (
                      <div className="flex items-center justify-end gap-2 text-[0.76rem]">
                        <span className="text-ink-muted">Delete this and its reading?</span>
                        <button
                          type="button"
                          onClick={() => {
                            removeEntry(entry.id);
                            setConfirmDelete(null);
                          }}
                          className="rounded-full bg-rose px-2.5 py-1 text-white"
                        >
                          Delete
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-full border border-line px-2.5 py-1">
                          Keep
                        </button>
                      </div>
                    )}

                    {/* assistant */}
                    <div className="flex items-start gap-2.5">
                      <span className="mt-1 shrink-0 text-forest">
                        <Mark size={22} />
                      </span>
                      <div className="min-w-0 max-w-[92%]">
                        {replies[entry.id]?.status === 'thinking' ? (
                          <p className="flex items-center gap-1 py-1 text-ink-muted" aria-label="Writing a reply">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.2s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted [animation-delay:-0.1s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-muted" />
                          </p>
                        ) : (
                          <p className="text-[0.92rem] leading-relaxed text-ink">
                            {replies[entry.id]?.text ?? reflection(entry)}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <MoodBadge band={shownBand} />
                          <span className="rounded-full border border-line bg-white/60 px-2 py-0.5 text-[0.68rem] text-ink-muted">
                            distress {entry.analysis.distress}
                          </span>
                          {entry.analysis.emotions.slice(0, 2).map((emotion) => (
                            <span key={emotion.label} className="rounded-full border border-line bg-white/60 px-2 py-0.5 text-[0.68rem] text-ink-muted">
                              {emotion.label}
                            </span>
                          ))}
                          {entry.feltMood && <span className="text-[0.66rem] text-forest">you corrected this</span>}
                        </div>

                        {risky && (
                          <div className="mt-3">
                            <CrisisCard level={entry.analysis.risk.level === 'urgent' ? 'urgent' : 'elevated'} compact />
                          </div>
                        )}

                        {!risky && entry.analysis.risk.subject === 'other' && (
                          <div className="mt-2 text-[0.8rem] leading-relaxed text-ink-soft">
                            If they are in danger, call{' '}
                            <a href="tel:112" className="font-medium text-rose underline underline-offset-2">
                              112
                            </a>{' '}
                            or{' '}
                            <a href="tel:0800678678" className="font-medium text-forest underline underline-offset-2">
                              0800 678 678
                            </a>
                            .{' '}
                            <Link to="/safety#someone" className="font-medium text-forest underline underline-offset-2">
                              How to talk to a friend
                            </Link>
                          </div>
                        )}

                        <p className="mt-1 text-[0.64rem] text-ink-muted">
                          {replies[entry.id]?.source === 'hf'
                            ? `via ${replies[entry.id]?.model ?? state.settings.ai.model}`
                            : replies[entry.id]?.note
                              ? `${replies[entry.id]?.note} · on-device reading`
                              : 'on-device reading'}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.72rem]">
                          <button
                            type="button"
                            onClick={() => setOpenWhy(openWhy === entry.id ? null : entry.id)}
                            aria-expanded={openWhy === entry.id}
                            className="inline-flex items-center gap-1 text-ink-muted hover:text-forest"
                          >
                            <Sparkles size={11} /> why
                            <ChevronDown size={11} className={clsx('transition-transform', openWhy === entry.id && 'rotate-180')} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCorrecting(correcting === entry.id ? null : entry.id)}
                            aria-expanded={correcting === entry.id}
                            className="text-ink-muted hover:text-forest"
                          >
                            not quite
                          </button>
                          <Link to="/patterns" className="text-ink-muted hover:text-forest">
                            pattern
                          </Link>
                        </div>

                        {correcting === entry.id && (
                          <div className="anim-fade mt-2 flex flex-wrap items-center gap-1.5">
                            {BANDS.map((band) => (
                              <button
                                key={band}
                                type="button"
                                onClick={() => {
                                  setFeltMood(entry.id, band);
                                  setCorrecting(null);
                                }}
                                className={clsx(
                                  'rounded-full border px-2.5 py-1 text-[0.72rem] transition-colors',
                                  shownBand === band ? bandChip[band].classes : 'border-line text-ink-muted hover:border-ink/20',
                                )}
                              >
                                {bandChip[band].label}
                              </button>
                            ))}
                            {entry.feltMood && (
                              <button
                                type="button"
                                onClick={() => setFeltMood(entry.id, null)}
                                className="text-[0.7rem] text-ink-muted underline underline-offset-2 hover:text-forest"
                              >
                                use the reading
                              </button>
                            )}
                          </div>
                        )}

                        {openWhy === entry.id && (
                          <div className="anim-fade mt-3">
                            <AnalysisPanel analysis={entry.analysis} compact />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* -------- composer -------- */}
            <div className="sticky bottom-16 z-20 pb-2 lg:bottom-0">
              <div className="rounded-2xl border border-line bg-paper/95 p-2 shadow-[0_-8px_24px_-24px_rgba(22,33,29,0.5)] backdrop-blur">
                <label htmlFor="entry" className="sr-only">
                  Write your entry
                </label>
                <textarea
                  id="entry"
                  ref={inputRef}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Say it how you would say it…"
                  className="max-h-40 w-full resize-none border-0 bg-transparent px-2 py-1.5 text-[0.95rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted/70"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setVoiceOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.78rem] text-forest hover:bg-forest/8"
                    aria-haspopup="dialog"
                  >
                    <Mic size={16} /> Speak
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="hidden text-[0.64rem] text-ink-muted sm:inline">Enter to send</span>
                    <button
                      type="button"
                      onClick={send}
                      disabled={!text.trim()}
                      aria-label="Send entry"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-paper transition-opacity disabled:opacity-30"
                    >
                      <ArrowUp size={17} />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-1.5 px-1 text-center text-[0.64rem] text-ink-muted">
                Nkommo is not a diagnosis or an emergency service. Danger now? Call 112.
              </p>
            </div>
          </section>
        </div>
      </div>

      <VoiceSheet open={voiceOpen} onClose={() => setVoiceOpen(false)} onInsert={(spoken) => {
        setUsedVoice(true);
        setText((prev) => `${prev}${prev.trim() ? ' ' : ''}${spoken} `);
        inputRef.current?.focus();
      }} />
    </>
  );
}
