/**
 * Voice journalling via the browser's SpeechRecognition.
 *
 * Honest note surfaced in the UI: in Chrome this API streams audio to the
 * browser vendor's speech service. Nothing is stored by Nkommo, but it is not
 * on-device either. On-device transcription (Whisper.cpp / Android Speech) is
 * the production path — see docs/ROADMAP.md Stage 5.
 *
 * Chrome ends recognition after a pause, so a session restarts it until the
 * writer stops. Restarts are capped to avoid a silent permission loop.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface SpeechResultAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechResultAlternative;
  length: number;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const SPEECH_ERROR_COPY: Record<string, string> = {
  'not-allowed':
    'The microphone is blocked. Open this page in its own tab, allow the mic, or type instead — typing always works.',
  'service-not-allowed':
    'Your browser blocked its speech service here. Opening the page in a new tab usually fixes it; typing always works.',
  'no-speech': 'We did not hear anything. Move closer to the mic, or type instead.',
  network: 'The browser’s speech service could not be reached — it needs a connection. Typing works offline.',
  aborted: 'Listening stopped.',
  'audio-capture': 'No microphone was found on this device.',
  'language-not-supported': 'This browser does not support English speech here. Typing works instead.',
};

const MAX_RESTARTS = 12;

export function useSpeech() {
  const supported = Boolean(getConstructor());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const restartsRef = useRef(0);

  const hardStop = useCallback(() => {
    wantRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setListening(false);
    setInterim('');
  }, []);

  useEffect(() => () => hardStop(), [hardStop]);

  const begin = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) {
      setError('This browser cannot turn speech into text. Typing works every time.');
      return;
    }
    try {
      const recognition = new Ctor();
      // en-GB is the closest widely supported locale to Ghanaian English;
      // 'en-GH' is rejected by several speech backends.
      recognition.lang = 'en-GB';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // Chrome 138+ can transcribe on-device. Ask for it when the browser
      // supports the flag; otherwise the vendor service is used and the sheet
      // says so.
      try {
        if ('processLocally' in recognition) recognition.processLocally = true;
      } catch {
        // older browsers reject the assignment; ignore
      }

      recognition.onstart = () => {
        restartsRef.current = 0;
        setListening(true);
        setError(null);
      };
      recognition.onresult = (event) => {
        let pending = '';
        const finals: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          // Final chunks are committed once. Interim chunks are shown, never
          // appended to the entry — otherwise the same words land twice.
          if (result.isFinal) finals.push(result[0].transcript);
          else pending += result[0].transcript;
        }
        if (finals.length) {
          setFinalText((prev) => {
            const next = `${prev}${prev && !/\s$/.test(prev) ? ' ' : ''}${finals.join(' ').trim()}`;
            return next.replace(/\s+/g, ' ').trimStart();
          });
        }
        setInterim(pending);
      };
      recognition.onerror = (event) => {
        wantRef.current = false;
        setError(SPEECH_ERROR_COPY[event.error] ?? 'Speech recognition stopped unexpectedly. Typing works every time.');
        setListening(false);
        setInterim('');
      };
      recognition.onend = () => {
        setListening(false);
        setInterim('');
        if (wantRef.current && restartsRef.current < MAX_RESTARTS) {
          restartsRef.current += 1;
          window.setTimeout(() => {
            if (!wantRef.current) return;
            try {
              recognition.start();
            } catch {
              wantRef.current = false;
            }
          }, 220);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setError('Could not start the microphone. Typing works every time.');
      setListening(false);
    }
  }, []);

  const start = useCallback(() => {
    setError(null);
    wantRef.current = true;
    begin();
  }, [begin]);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
    setInterim('');
  }, []);

  const clear = useCallback(() => {
    setFinalText('');
    setInterim('');
    setError(null);
  }, []);

  return {
    supported,
    listening,
    error,
    interim,
    finalText,
    start,
    stop,
    clear,
    setFinalText,
    clearError: () => setError(null),
    // exposed for the sheet's teardown
    shutdown: hardStop,
  };
}
