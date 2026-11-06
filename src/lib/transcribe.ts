/**
 * Optional server-side transcription, used only when the browser has no
 * SpeechRecognition but does have a microphone. The endpoint is the Firebase
 * Function in `functions/`, or any service that accepts a raw audio body and
 * returns `{ text }`. Without it, the voice sheet says so instead of pretending.
 */
export function transcribeUrl(): string | null {
  const value = (import.meta.env.VITE_TRANSCRIBE_URL ?? '').trim();
  return value.length > 0 ? value : null;
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const url = transcribeUrl();
  if (!url) throw new Error('no-transcriber');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': blob.type || 'audio/webm' },
    body: blob,
  });
  if (!response.ok) throw new Error(`transcribe-failed-${response.status}`);

  const data = (await response.json()) as { text?: unknown };
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text) throw new Error('transcribe-empty');
  return text;
}
