import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { StoreProvider } from '../data/store';
import { mergeById, newestFirst, settingsForCloud, settingsFromCloud } from '../lib/cloudModel';
import { transcribeAudio, transcribeUrl } from '../lib/transcribe';
import type { Settings } from '../engine/types';

const LOCAL_SETTINGS: Settings = {
  displayName: 'Ama',
  language: 'en',
  remindersEnabled: true,
  morningTime: '07:30',
  eveningTime: '20:30',
  onboarded: true,
  trusted: { name: 'Efua', relationship: 'Sister', phone: '+233200000000', enabled: true, escalateAfterDays: 3, shareJournals: false },
  clinicianMode: false,
  showResourcesOnOpen: true,
  location: { lat: 5.6, lng: -0.19, region: 'Greater Accra', label: 'your approximate position', source: 'gps', updatedAt: '2026-11-01T00:00:00.000Z' },
  ai: { enabled: true, model: 'some/model' },
  cloudEnabled: false,
  lastBackupAt: null,
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}

describe('what may be uploaded', () => {
  it('never includes location, the trusted contact or the model token', () => {
    const cloud = settingsForCloud(LOCAL_SETTINGS);
    expect(Object.keys(cloud).sort()).toEqual(['displayName', 'eveningTime', 'language', 'morningTime', 'remindersEnabled']);
    expect(JSON.stringify(cloud)).not.toMatch(/lat|lng|phone|Greater Accra|some\/model/);
  });

  it('keeps device-only fields when cloud settings come back', () => {
    const patch = settingsFromCloud(
      { displayName: 'Kojo', language: 'tw-en', remindersEnabled: false, morningTime: '06:45', eveningTime: '21:00' },
      LOCAL_SETTINGS,
    );
    expect(patch.displayName).toBe('Kojo');
    expect(patch.morningTime).toBe('06:45');
    expect(patch.location).toBe(LOCAL_SETTINGS.location);
    expect(patch.trusted).toBe(LOCAL_SETTINGS.trusted);
    expect(patch.ai).toBe(LOCAL_SETTINGS.ai);
  });

  it('ignores junk from the cloud', () => {
    const patch = settingsFromCloud({ language: 'fr' as never, morningTime: 42 as never }, LOCAL_SETTINGS);
    expect(patch.language).toBeUndefined();
    expect(patch.morningTime).toBeUndefined();
  });

  it('merges by id, with the cloud winning a clash', () => {
    const merged = mergeById(
      [
        { id: 'a', text: 'local a' },
        { id: 'b', text: 'local b' },
      ],
      [
        { id: 'b', text: 'cloud b' },
        { id: 'c', text: 'cloud c' },
      ],
    );
    expect(merged.map((m) => `${m.id}:${m.text}`).sort()).toEqual(['a:local a', 'b:cloud b', 'c:cloud c']);
  });

  it('sorts newest first', () => {
    expect(newestFirst([{ id: 'old', createdAt: '2026-01-01' }, { id: 'new', createdAt: '2026-02-01' }]).map((m) => m.id)).toEqual([
      'new',
      'old',
    ]);
  });
});

describe('optional transcription endpoint', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('is absent unless the build configures one', async () => {
    vi.stubEnv('VITE_TRANSCRIBE_URL', '');
    expect(transcribeUrl()).toBeNull();
    await expect(transcribeAudio(new Blob(['x'], { type: 'audio/webm' }))).rejects.toThrow('no-transcriber');
  });

  it('posts the recording and returns the text', async () => {
    vi.stubEnv('VITE_TRANSCRIBE_URL', 'https://example.test/transcribe');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ text: ' I spoke this. ' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const text = await transcribeAudio(new Blob(['audio'], { type: 'audio/webm' }));
    expect(text).toBe('I spoke this.');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/transcribe',
      expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'audio/webm' } }),
    );
  });

  it('reports a failed or empty transcription instead of inventing text', async () => {
    vi.stubEnv('VITE_TRANSCRIBE_URL', 'https://example.test/transcribe');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 502 })));
    await expect(transcribeAudio(new Blob(['a']))).rejects.toThrow('transcribe-failed-502');

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ text: '   ' }), { status: 200 })));
    await expect(transcribeAudio(new Blob(['a']))).rejects.toThrow('transcribe-empty');
  });
});

describe('cloud card without a project', () => {
  it('says so and keeps the local journal working', async () => {
    window.localStorage.clear();
    const user = userEvent.setup();
    renderAt('/settings');

    expect(await screen.findByRole('heading', { name: /cloud backup/i })).toBeTruthy();
    expect(screen.getByText(/not configured in this build/i)).toBeTruthy();
    expect(screen.getByText(/entries leave this device only after you sign in/i)).toBeTruthy();
    expect(screen.queryByLabelText(/cloud email/i)).toBeNull();

    // The rest of settings still works.
    await user.click(screen.getByRole('switch', { name: /show the prompter/i }));
    const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(stored.settings.remindersEnabled).toBe(false);
  });
});

describe('microphone permission', () => {
  class FakeRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    started = 0;
    onstart: (() => void) | null = null;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start() {
      this.started += 1;
      this.onstart?.();
    }
    stop() {
      this.onend?.();
    }
    abort() {
      /* noop */
    }
  }

  const recognitions: FakeRecognition[] = [];

  class TrackingRecognition extends FakeRecognition {
    constructor() {
      super();
      recognitions.push(this);
    }
  }

  beforeEach(() => {
    window.localStorage.clear();
    recognitions.length = 0;
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = TrackingRecognition;
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true, writable: true });
  });

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true, writable: true });
  });

  it('does not start recognition when the mic is blocked, and says why', async () => {
    const getUserMedia = vi.fn(async () => {
      const error = new Error('denied');
      error.name = 'NotAllowedError';
      throw error;
    });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true, writable: true });

    const user = userEvent.setup();
    renderAt('/journal');
    await user.click(await screen.findByRole('button', { name: /skip for now/i }));
    await user.click((await screen.findAllByRole('button', { name: /^speak$/i }))[0]);

    expect(await screen.findByText(/microphone is blocked here/i)).toBeTruthy();
    expect(getUserMedia).toHaveBeenCalled();
    expect(recognitions.every((r) => r.started === 0)).toBe(true);
  });

  it('starts recognition once the mic is granted', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] };
    const getUserMedia = vi.fn(async () => stream);
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true, writable: true });

    const user = userEvent.setup();
    renderAt('/journal');
    await user.click(await screen.findByRole('button', { name: /skip for now/i }));
    await user.click((await screen.findAllByRole('button', { name: /^speak$/i }))[0]);

    await waitFor(() => expect(recognitions.some((r) => r.started > 0)).toBe(true));
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });
});
