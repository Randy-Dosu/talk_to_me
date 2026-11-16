import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Keyboard, Mic, MicOff, RotateCcw, Square, X } from 'lucide-react';
import { useSpeech } from '../lib/useSpeech';
import { useRecorder } from '../lib/useRecorder';
import { transcribeUrl } from '../lib/transcribe';

/**
 * Full-screen voice capture. The browser does the speech-to-text; this app has
 * no server, so only words the writer approves ever reach the journal.
 */
export default function VoiceSheet({
  open,
  onClose,
  onInsert,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}) {
  const speech = useSpeech();
  const recorder = useRecorder();
  const canTranscribe = Boolean(transcribeUrl());
  const mode = speech.supported ? 'recognition' : recorder.supported && canTranscribe ? 'recorder' : 'none';
  const [seconds, setSeconds] = useState(0);
  const started = useRef(false);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);

  // Start on open (a click is the user gesture the mic needs), stop on close.
  useEffect(() => {
    if (!open) {
      speech.shutdown();
      setSeconds(0);
      started.current = false;
      return;
    }
    if (!started.current) {
      started.current = true;
      speech.clear();
      if (mode === 'recognition') void speech.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || (!speech.listening && !recorder.recording)) return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [open, speech.listening, recorder.recording]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasWords = speech.finalText.trim().length > 0;
  const active = speech.listening || recorder.recording;
  const embedded = typeof window !== 'undefined' && window.self !== window.top;
  const errorText = speech.error ?? recorder.error;
  const heading = speech.listening ? 'Listening' : recorder.recording ? 'Recording' : hasWords ? 'Paused' : 'Ready';
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const insert = () => {
    if (!hasWords) return;
    onInsert(speech.finalText.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Speak your entry"
        className="anim-rise flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-line bg-paper shadow-2xl sm:rounded-[2rem]"
      >
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${speech.listening ? 'bg-clay/12 text-clay' : 'bg-forest/8 text-forest'}`}>
              <Mic size={16} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Speak your entry</p>
              <p className="text-[0.7rem] text-ink-muted">{heading}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-muted hover:bg-ink/5" aria-label="Close voice input">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col items-center px-5 pt-6">
          <button
            type="button"
            onClick={() => {
              if (mode === 'recorder') {
                if (recorder.recording) {
                  recorder.stop();
                } else {
                  void recorder.start((text) =>
                    speech.setFinalText((prev) => `${prev}${prev.trim() ? ' ' : ''}${text}`.trim()),
                  );
                }
                return;
              }
              if (speech.listening) speech.stop();
              else void speech.start();
            }}
            disabled={mode === 'none' || recorder.transcribing}
            aria-label={active ? 'Stop listening' : 'Start listening'}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white transition-transform active:scale-95 ${
              active ? 'bg-clay' : 'bg-forest'
            } disabled:bg-ink/20`}
          >
            {active && (
              <>
                <span
                  className="absolute -inset-2 rounded-full bg-clay/25 transition-transform duration-100"
                  style={{ transform: `scale(${1 + speech.level * 0.35})`, opacity: 0.35 + speech.level * 0.5 }}
                />
                <span className="absolute inset-0 animate-ping rounded-full bg-clay/20" />
              </>
            )}
            {active ? <Square size={26} fill="currentColor" /> : mode === 'none' ? <MicOff size={28} /> : <Mic size={30} />}
          </button>
          <p className="mt-3 font-display text-2xl tabular-nums text-ink">{time}</p>
          <p className="text-[0.72rem] text-ink-muted">
            {mode === 'none'
              ? 'Voice input is not available in this browser.'
              : recorder.transcribing
                ? 'Turning the recording into text…'
                : active
                  ? 'Speak normally. Tap to stop.'
                  : speech.micState === 'denied'
                    ? 'Microphone blocked — allow it in the address bar, or type.'
                    : 'Tap the mic to start.'}
          </p>
        </div>

        <div className="min-h-0 flex-1 px-5 py-4">
          {errorText ? (
            <div className="rounded-2xl border border-gold/35 bg-gold/10 p-3.5">
              <p className="text-[0.82rem] leading-relaxed text-[#6f5310]">{errorText}</p>
              {embedded && (
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                  className="mt-2 inline-flex items-center gap-1 text-[0.78rem] font-medium text-forest underline decoration-line underline-offset-2"
                >
                  <ExternalLink size={12} /> Open in its own tab
                </button>
              )}
              {mode === 'none' && (
                <p className="mt-2 text-[0.76rem] leading-relaxed text-[#6f5310]/80">
                  Chrome and Edge on a laptop or Android can transcribe without a server. Typing always works.
                </p>
              )}
            </div>
          ) : (
            <label className="block">
              <span className="sr-only">Your spoken words</span>
              <textarea
                ref={transcriptRef}
                value={speech.finalText}
                onChange={(event) => speech.setFinalText(event.target.value)}
                rows={5}
                placeholder="Your words will appear here as you speak. You can edit them before adding."
                className="w-full resize-none rounded-2xl border border-line bg-white/70 p-3.5 text-[0.95rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted/70 focus:border-sage/60"
              />
            </label>
          )}
          {speech.interim && (
            <p className="mt-1 px-1 text-[0.82rem] italic leading-snug text-forest/70" aria-live="polite">
              {speech.interim}
            </p>
          )}
        </div>

        <div className="border-t border-line/70 bg-paper-deep/40 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={insert} disabled={!hasWords} className="btn btn-primary flex-1 text-[0.86rem]">
              Use these words <ArrowRight size={14} />
            </button>
            {hasWords && (
              <button type="button" onClick={speech.clear} className="btn btn-ghost px-3 text-[0.82rem]" aria-label="Clear transcript">
                <RotateCcw size={14} />
              </button>
            )}
            <button type="button" onClick={onClose} className="btn btn-ghost px-3 text-[0.82rem]">
              <Keyboard size={14} /> Type
            </button>
          </div>
          <p className="mt-2 text-center text-[0.66rem] leading-relaxed text-ink-muted">
            {mode === 'recorder'
              ? 'Your browser cannot transcribe alone, so the recording goes to the transcription endpoint configured for this build.'
              : 'Your browser turns speech into text. Only the words you keep are stored.'}
          </p>
        </div>
      </div>
    </div>
  );
}
