/**
 * Voice journalling via the browser's SpeechRecognition.
 *
 * Honest note surfaced in the UI: in Chrome this API streams audio to the
 * browser vendor's speech service. Nothing is stored by Nkommo, but it is not
 * on-device either. On-device transcription (Whisper.cpp / Android Speech) is
 * the production path for the native app — see docs/ROADMAP.md Stage 5.
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

const ERROR_COPY: Record<string, string> = {
  'not-allowed': 'Microphone permission was blocked. Allow the mic in your browser settings, or just type — typing works every time.',
  'service-not-allowed': 'Your browser blocked its speech service. Typing works every time.',
  'no-speech': 'We did not hear anything. Try again, or type instead.',
  network: 'The browser’s speech service could not be reached. It needs a connection — typing works offline.',
  aborted: 'Listening stopped.',
  'audio-capture': 'No microphone was found on this device.',
};

export function useSpeech(onTranscript: (text: string, isFinal: boolean) => void) {
  const supported = Boolean(getConstructor());
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callbackRef = useRef(onTranscript);
  callbackRef.current = onTranscript;

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) {
      setError('This browser cannot transcribe speech. Typing works every time.');
      return;
    }
    setError(null);
    try {
      const recognition = new Ctor();
      recognition.lang = 'en-GH';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setListening(true);
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          callbackRef.current(result[0].transcript, result.isFinal);
        }
      };
      recognition.onerror = (event) => {
        setError(ERROR_COPY[event.error] ?? 'Speech recognition stopped unexpectedly. Typing works every time.');
        setListening(false);
      };
      recognition.onend = () => setListening(false);

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setError('Could not start the microphone. Typing works every time.');
      setListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  return { supported, listening, error, start, stop, clearError: () => setError(null) };
}
