import { useCallback, useRef, useState } from 'react';
import { transcribeAudio } from './transcribe';

/**
 * Fallback capture for browsers without SpeechRecognition (Firefox, older
 * Safari). It records audio and posts it to the configured transcription
 * endpoint. Nothing is uploaded unless the person taps record, and the sheet
 * says where the audio goes.
 */
export function useRecorder() {
  const supported =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = useCallback(
    async (onText: (text: string) => void) => {
      setError(null);
      if (!supported) {
        setError('Recording is not available in this browser.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setRecording(false);
          const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
          if (blob.size === 0) {
            setError('Nothing was recorded.');
            return;
          }
          setTranscribing(true);
          try {
            const text = await transcribeAudio(blob);
            onText(text);
          } catch (err) {
            const code = err instanceof Error ? err.message : '';
            setError(
              code === 'no-transcriber'
                ? 'This browser cannot transcribe by itself, and no transcription endpoint is configured in this build. Typing always works.'
                : 'Transcription failed. The recording was not kept.',
            );
          } finally {
            setTranscribing(false);
          }
        };
        recorder.start();
        recorderRef.current = recorder;
        setRecording(true);
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'The microphone is blocked here. Allow the mic or type instead.'
            : 'Could not reach the microphone. Typing works instead.',
        );
      }
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  return { supported, recording, transcribing, error, start, stop };
}
