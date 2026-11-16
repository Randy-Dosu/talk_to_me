import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown, CornerDownLeft, Lightbulb, Mic, PenLine, Sparkles } from 'lucide-react';
import { analyse } from '../engine/analyze';
import type { Analysis, JournalEntry } from '../engine/types';
import { useStore } from '../data/store';
import AnalysisPanel from './AnalysisPanel';
import CrisisCard from './CrisisCard';
import VoiceSheet from './VoiceSheet';
import { MoodBadge } from './ui';

const PROMPTS = ['Today felt…', 'What did today cost me?', 'One thing nobody knows…', 'Something small that helped…'];

export default function Composer({ onSaved }: { onSaved?: (entry: JournalEntry) => void }) {
  const { addEntry } = useStore();
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<Analysis | null>(null);
  const [saved, setSaved] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showPrompts, setShowPrompts] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const savedTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }
    const timer = window.setTimeout(() => setPreview(analyse(text)), 420);
    return () => window.clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
    };
  }, []);

  const wordCount = useMemo(() => text.trim().split(/\s+/).filter(Boolean).length, [text]);
  const risky = preview && (preview.risk.level === 'urgent' || preview.risk.level === 'elevated');

  const appendWords = (spoken: string) => {
    setUsedVoice(true);
    setText((prev) => {
      const base = prev.trimEnd();
      const needsSpace = base.length > 0 && !/[.,!?\s]$/.test(base);
      return `${base}${needsSpace ? ' ' : ''}${spoken.trim()} `;
    });
    textareaRef.current?.focus();
  };

  const save = () => {
    const entry = addEntry(text, usedVoice ? 'voice' : 'typed');
    if (!entry) return;
    setText('');
    setUsedVoice(false);
    setPreview(null);
    setShowWhy(false);
    setSaved(true);
    onSaved?.(entry);
    if (savedTimer.current) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 4200);
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-4 py-2.5 md:px-5">
          <div className="flex items-center gap-2 text-[0.82rem] font-medium text-ink-soft">
            <PenLine size={15} className="text-forest" />
            Today&rsquo;s entry
          </div>
          <div className="flex items-center gap-2">
            {preview && <MoodBadge band={preview.moodBand} />}
            <span className="hidden text-[0.68rem] text-ink-muted sm:inline">stays in this browser</span>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <label htmlFor="entry" className="sr-only">
            Write your entry
          </label>
          <textarea
            id="entry"
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') save();
            }}
            rows={6}
            placeholder="Say it how you would say it — English, Pidgin, half-and-half."
            className="w-full resize-y border-0 bg-transparent p-0.5 text-[1rem] leading-relaxed text-ink outline-none placeholder:text-ink-muted/70"
          />

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-ink-muted">
            {wordCount > 0 ? (
              <span>
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
                {usedVoice && <span className="text-forest/70"> · spoken</span>}
              </span>
            ) : (
              <span>Speak it or type it. One line counts.</span>
            )}
            <button
              type="button"
              onClick={() => setShowPrompts((value) => !value)}
              className="inline-flex items-center gap-1 text-ink-muted underline decoration-line underline-offset-2 hover:text-forest"
              aria-expanded={showPrompts}
            >
              <Lightbulb size={11} /> prompt
            </button>
          </div>

          {showPrompts && (
            <div className="anim-fade mt-2 flex flex-wrap gap-1.5">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${prompt} ` : `${prompt} `));
                    setShowPrompts(false);
                    textareaRef.current?.focus();
                  }}
                  className="rounded-full border border-line bg-white/60 px-2.5 py-1 text-[0.72rem] text-ink-soft transition-colors hover:border-sage/40 hover:text-forest"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        {risky && preview && (
          <div className="px-4 pb-4 md:px-5">
            <CrisisCard level={preview.risk.level === 'urgent' ? 'urgent' : 'elevated'} compact />
          </div>
        )}

        {preview && !risky && (
          <div className="mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line/70 bg-paper-deep/40 px-3 py-2 md:mx-5">
            <span className="text-[0.75rem] text-ink-soft">
              distress <span className="font-medium text-ink">{preview.distress}</span>
              {preview.emotions[0] && <span className="text-ink-muted"> · {preview.emotions[0].label}</span>}
            </span>
            <button
              type="button"
              onClick={() => setShowWhy((value) => !value)}
              className="ml-auto inline-flex items-center gap-1 text-[0.72rem] text-forest"
              aria-expanded={showWhy}
            >
              <Sparkles size={12} /> why
              <ChevronDown size={12} className={clsx('transition-transform', showWhy && 'rotate-180')} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line/70 bg-paper-deep/30 px-4 py-3 md:px-5">
          <button
            type="button"
            onClick={() => setVoiceOpen(true)}
            className={clsx('btn px-3.5 py-2 text-[0.84rem]', usedVoice ? 'btn-primary' : 'btn-ghost')}
            aria-haspopup="dialog"
          >
            <Mic size={15} /> Speak
          </button>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="anim-fade inline-flex items-center gap-1 text-[0.74rem] text-[#456b4b]">
                <Check size={13} /> Kept. Only you.
              </span>
            )}
            <button type="button" onClick={save} disabled={!text.trim()} className="btn btn-primary px-4 py-2 text-[0.84rem]">
              Keep this entry
              <CornerDownLeft size={13} className="opacity-60" />
            </button>
          </div>
        </div>

        {showWhy && preview && (
          <div className="anim-fade border-t border-line/70 p-4 md:p-5">
            <AnalysisPanel analysis={preview} compact />
          </div>
        )}
      </div>

      <VoiceSheet open={voiceOpen} onClose={() => setVoiceOpen(false)} onInsert={appendWords} />
    </>
  );
}
