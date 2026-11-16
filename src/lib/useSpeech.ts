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

type MicState = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable';

function describeMicError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'The microphone is blocked here. Allow the mic, open the page in its own tab, or type instead — typing always works.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No microphone was found on this device. Typing works instead.';
  }
  return 'Could not reach the microphone. Another app may be holding it. Typing works instead.';
}

export function useSpeech() {
  const supported = Boolean(getConstructor());
  const [micState, setMicState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const restartsRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const meterRef = useRef<{ context: AudioContext; analyser: AnalyserNode } | null>(null);
  const frameRef = useRef<number | null>(null);

  const stopMeter = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const meter = meterRef.current;
    meterRef.current = null;
    if (meter) {
      try {
        meter.context.close();
      } catch {
        // already closed
      }
    }
    setLevel(0);
  }, []);

  const releaseMic = useCallback(() => {
    stopMeter();
    const stream = streamRef.current;
    streamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
  }, [stopMeter]);

  const startMeter = useCallback((stream: MediaStream) => {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    try {
      const context = new AudioCtor();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      meterRef.current = { context, analyser };
      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) {
          const centred = (value - 128) / 128;
          sum += centred * centred;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 3));
        frameRef.current = window.requestAnimationFrame(loop);
      };
      frameRef.current = window.requestAnimationFrame(loop);
    } catch {
      // A meter is a nicety; recognition works without it.
    }
  }, []);

  /**
   * Ask for the microphone explicitly before handing over to recognition. This
   * is what makes the browser permission prompt appear, and it lets the sheet
   * say "blocked" instead of failing silently.
   */
  const ensureMic = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicState('unavailable');
      // No getUserMedia (jsdom, old browsers): let recognition try anyway.
      return true;
    }
    if (streamRef.current) {
      setMicState('ready');
      return true;
    }
    setMicState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicState('ready');
      startMeter(stream);
      return true;
    } catch (error) {
      releaseMic();
      const name = error instanceof Error ? error.name : '';
      setMicState(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
      setError(describeMicError(error));
      return false;
    }
  }, [releaseMic, startMeter]);

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
    releaseMic();
  }, [releaseMic]);

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
        releaseMic();
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

  const start = useCallback(async () => {
    setError(null);
    wantRef.current = true;
    const ok = await ensureMic();
    if (!ok) {
      wantRef.current = false;
      return;
    }
    begin();
  }, [begin, ensureMic]);

  const stop = useCallback(() => {
    wantRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    setListening(false);
    setInterim('');
    releaseMic();
  }, [releaseMic]);

  const clear = useCallback(() => {
    setFinalText('');
    setInterim('');
    setError(null);
  }, []);

  return {
    supported,
    listening,
    micState,
    level,
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
