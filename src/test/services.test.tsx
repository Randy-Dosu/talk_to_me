import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { StoreProvider } from '../data/store';
import { FACILITIES, REGIONS, REGION_CENTROIDS } from '../data/facilities';
import { distanceKm, formatKm, nearestFacility, rankFacilities, regionForPoint, regionOrigin } from '../lib/geo';
import { DEFAULT_HF_MODEL, maySendToModel, sanitizeReply, setHfToken, hfReply } from '../lib/hfChat';
import { analyse } from '../engine/analyze';

const STORAGE_KEY = 'nkommo.store.v1';

function seedStore(patch: Record<string, unknown> = {}) {
  const store = {
    version: 1,
    entries: [],
    checkins: [],
    settings: { onboarded: true, displayName: 'Kofi', language: 'en', ...(patch.settings as object) },
    safetyPlan: { warningSigns: [], copingSteps: [], people: [], places: [], reasons: [], professional: '' },
    alerts: [],
    ...patch,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}

const stubbed: unknown[] = [];

function mockGeolocation(impl: 'success' | 'denied') {
  const geolocation = {
    getCurrentPosition: (success: (position: unknown) => void, failure?: (error: unknown) => void) => {
      if (impl === 'success') {
        success({ coords: { latitude: 5.6037, longitude: -0.187 } });
      } else {
        failure?.({ code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3, message: 'denied' });
      }
    },
  };
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true, writable: true });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  stubbed.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('facility data', () => {
  it('has unique ids, Ghana-plausible coordinates and a service list', () => {
    const ids = new Set(FACILITIES.map((facility) => facility.id));
    expect(ids.size).toBe(FACILITIES.length);
    for (const facility of FACILITIES) {
      expect(facility.lat).toBeGreaterThan(4.5);
      expect(facility.lat).toBeLessThan(11.3);
      expect(facility.lng).toBeGreaterThan(-3.4);
      expect(facility.lng).toBeLessThan(1.3);
      expect(facility.services.length).toBeGreaterThan(0);
      if (facility.tel) expect(facility.tel.replace(/\D/g, '').length).toBeGreaterThanOrEqual(9);
    }
  });

  it('reads a region from a live coordinate', () => {
    expect(regionForPoint({ lat: 5.6037, lng: -0.187 })).toBe('Greater Accra');
    expect(regionForPoint({ lat: 6.6885, lng: -1.6244 })).toBe('Ashanti');
    expect(regionForPoint({ lat: 9.4008, lng: -0.8393 })).toBe('Northern');
    expect(regionForPoint({ lat: 6.6008, lng: 0.4713 })).toBe('Volta');
    expect(regionForPoint({ lat: 10.0601, lng: -2.5099 })).toBe('Upper West');
  });

  it('covers every region with a centroid', () => {
    expect(REGIONS).toHaveLength(16);
    for (const region of REGIONS) {
      const centroid = REGION_CENTROIDS[region];
      expect(centroid.lat).toBeGreaterThan(4.5);
      expect(centroid.lng).toBeLessThan(1.3);
      expect(regionOrigin(region)).toEqual(centroid);
    }
  });
});

describe('distance ranking', () => {
  it('measures Accra to Kumasi at roughly 200 km', () => {
    const km = distanceKm({ lat: 5.6037, lng: -0.187 }, { lat: 6.6885, lng: -1.6244 });
    expect(km).toBeGreaterThan(180);
    expect(km).toBeLessThan(230);
  });

  it('is symmetric and zero at the same point', () => {
    const a = { lat: 5.6, lng: -0.2 };
    const b = { lat: 9.4, lng: -0.84 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 6);
    expect(distanceKm(a, a)).toBe(0);
  });

  it('ranks an Accra position to an Accra facility first', () => {
    const [closest] = rankFacilities({ lat: 5.6037, lng: -0.187 }, 3);
    expect(closest.facility.region).toBe('Greater Accra');
    expect(closest.km).toBeLessThan(15);
  });

  it('ranks a Tamale position to Tamale Teaching Hospital', () => {
    const closest = nearestFacility({ lat: 9.4008, lng: -0.8393 });
    expect(closest.facility.id).toBe('tth');
    expect(closest.km).toBeLessThan(2);
  });

  it('formats distances for people, not machines', () => {
    expect(formatKm(0.42)).toBe('420 m');
    expect(formatKm(4.26)).toBe('4.3 km');
    expect(formatKm(212.4)).toBe('212 km');
  });
});

describe('hugging face adapter', () => {
  const safeAnalysis = analyse('Today was heavy but I showed up.');

  it('never sends a high-risk entry to a third party', () => {
    expect(maySendToModel(analyse('I am fine, just tired.'), 'I am fine, just tired.')).toBe(true);
    expect(maySendToModel(analyse('I have been thinking about how I would do it.'), 'I have been thinking about how I would do it.')).toBe(false);
    expect(maySendToModel(analyse('I want to die.'), 'I want to die.')).toBe(false);
  });

  it('strips a diagnostic claim instead of showing it', () => {
    expect(sanitizeReply('you have depression and should take pills')).toBeNull();
    expect(sanitizeReply('Assistant: That sounds exhausting. What helped today?')).toBe(
      'That sounds exhausting. What helped today?',
    );
    expect(sanitizeReply('x'.repeat(900))?.endsWith('…')).toBe(true);
    expect(sanitizeReply('   ')).toBeNull();
  });

  it('returns a reply from the chat-completions endpoint', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: 'That sounds exhausting. What helped today?' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await hfReply({ text: 'Long day.', analysis: safeAnalysis, model: 'test/model', token: 'hf_abc' });
    expect(result.ok).toBe(true);
    expect(result.text).toMatch(/what helped today/i);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer hf_abc');
    const body = JSON.parse(String(init.body)) as { model: string; messages: { role: string; content: string }[] };
    expect(body.model).toBe('test/model');
    expect(body.messages[0].content).toMatch(/never diagnose/i);
    expect(body.messages.at(-1)?.content).toContain('Long day.');
  });

  it('reports auth, network and empty answers without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    expect((await hfReply({ text: 'x', analysis: safeAnalysis, model: 'm', token: 't' })).kind).toBe('auth');

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('failed to fetch'))));
    expect((await hfReply({ text: 'x', analysis: safeAnalysis, model: 'm', token: 't' })).kind).toBe('network');

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '   ' } }] }), { status: 200 })),
    );
    expect((await hfReply({ text: 'x', analysis: safeAnalysis, model: 'm', token: 't' })).kind).toBe('empty');
  });
});

describe('the optional model in the chat', () => {
  it('shows the model reply and says where it came from', async () => {
    seedStore({ settings: { onboarded: true, displayName: 'Kofi', ai: { enabled: true, model: 'test/model' } } });
    window.sessionStorage.setItem('nkommo.hf.token', 'good-token');
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'That sounds heavy. What was the hardest part?' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderAt('/journal');
    await user.type(await screen.findByLabelText(/write your entry/i), 'Work was heavy today and I could not sleep.');
    await user.click(screen.getByRole('button', { name: /send entry/i }));

    expect(await screen.findByText(/that sounds heavy/i)).toBeTruthy();
    expect(screen.getAllByText(/via test\/model/i).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('huggingface.co');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer good-token');
  });

  it('never sends crisis text, even with the model on', async () => {
    seedStore({ settings: { onboarded: true, displayName: 'Kofi', ai: { enabled: true, model: 'test/model' } } });
    window.sessionStorage.setItem('nkommo.hf.token', 'good-token');
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderAt('/journal');
    await user.type(
      await screen.findByLabelText(/write your entry/i),
      'I do not want to be here anymore. I am tired of this life.',
    );
    await user.click(screen.getByRole('button', { name: /send entry/i }));

    expect(await screen.findByText(/on-device reading/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('nearby services in the app', () => {
  it('uses the browser location once and shows the closest hospital', async () => {
    mockGeolocation('success');
    seedStore({ settings: { onboarded: true, displayName: 'Kofi' } });
    const user = userEvent.setup();
    renderAt('/safety');

    await user.click((await screen.findAllByRole('button', { name: /use my location/i }))[0]);

    expect((await screen.findAllByText(/accra psychiatric hospital/i)).length).toBeGreaterThan(0);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.settings.location.source).toBe('gps');
    expect(stored.settings.location.lat).toBeCloseTo(5.6037, 3);
    expect(stored.settings.location.region).toBe('Greater Accra');
    expect((await screen.findAllByText(/greater accra · from your location/i)).length).toBeGreaterThan(0);
  });

  it('falls back to a region when location is blocked', async () => {
    mockGeolocation('denied');
    seedStore({ settings: { onboarded: true, displayName: 'Kofi' } });
    const user = userEvent.setup();
    renderAt('/safety');

    await user.click((await screen.findAllByRole('button', { name: /use my location/i }))[0]);
    expect(await screen.findByText(/location is blocked/i)).toBeTruthy();

    await user.selectOptions(screen.getAllByLabelText(/pick your region/i)[0], 'Ashanti');
    expect((await screen.findAllByText(/komfo anokye/i)).length).toBeGreaterThan(0);
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.settings.location.label).toBe('Ashanti');
    expect(stored.settings.location.source).toBe('manual');
  });

  it('fills the signup region from the device instead of asking', async () => {
    mockGeolocation('success');
    const user = userEvent.setup();
    renderAt('/signup');

    expect((await screen.findAllByText(/greater accra/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/live location/i).length).toBeGreaterThan(0);
    // The manual picker is a fallback, not the first thing asked.
    expect(screen.queryByLabelText(/which region are you in/i)).toBeNull();

    await user.type(screen.getByLabelText(/what should i call you/i), 'Ama');
    await user.click(screen.getByRole('checkbox', { name: /screening aid/i }));
    await user.click(screen.getByRole('button', { name: /start writing/i }));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.settings.location.source).toBe('gps');
    expect(stored.settings.location.region).toBe('Greater Accra');
    expect(stored.settings.displayName).toBe('Ama');
  });

  it('keeps a manual region pick when the device is blocked', async () => {
    mockGeolocation('denied');
    const user = userEvent.setup();
    renderAt('/signup');

    await user.selectOptions(await screen.findByLabelText(/which region are you in/i), 'Ashanti');
    await user.type(screen.getByLabelText(/what should i call you/i), 'Kwame');
    await user.click(screen.getByRole('checkbox', { name: /screening aid/i }));
    await user.click(screen.getByRole('button', { name: /start writing/i }));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.settings.location.source).toBe('manual');
    expect(stored.settings.location.region).toBe('Ashanti');
  });

  it('puts the nearest hospital inside the crisis card', async () => {
    seedStore({
      settings: {
        onboarded: true,
        displayName: 'Kofi',
        location: { lat: 5.6037, lng: -0.187, label: 'Accra', source: 'gps', updatedAt: new Date().toISOString() },
      },
    });
    const user = userEvent.setup();
    renderAt('/journal');

    const box = await screen.findByLabelText(/write your entry/i);
    await user.type(box, 'I do not want to be here anymore.');
    await user.click(screen.getByRole('button', { name: /send entry/i }));

    expect((await screen.findAllByText(/accra psychiatric hospital/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nearest mental-health service/i).length).toBeGreaterThan(0);
  });
});

describe('conversation model settings', () => {
  it('turns model replies on only with consent and a token, then forgets the token', async () => {
    seedStore();
    const user = userEvent.setup();
    renderAt('/settings');

    const toggle = await screen.findByRole('button', { name: /turn on model replies/i });
    expect((toggle as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByLabelText(/access token/i), 'hf_test_token');
    const consent = screen.getByRole('checkbox', { name: /i understand, and i want replies/i });
    await user.click(consent);
    await user.click(screen.getByRole('button', { name: /turn on model replies/i }));

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
      expect(stored.settings.ai.enabled).toBe(true);
      expect(stored.settings.ai.model).toBe(DEFAULT_HF_MODEL);
    });
    expect(window.sessionStorage.getItem('nkommo.hf.token')).toBe('hf_test_token');

    await user.click(screen.getByRole('button', { name: /turn off and forget token/i }));
    expect(window.sessionStorage.getItem('nkommo.hf.token')).toBeNull();
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.settings.ai.enabled).toBe(false);
  });

  it('shows a model reply in the chat when the model answers', async () => {
    seedStore({ settings: { onboarded: true, displayName: 'Kofi', ai: { enabled: true, model: 'test/model' } } });
    setHfToken('hf_token');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'That sounds like a lot to carry. What was the hardest part?' } }] }), {
          status: 200,
        }),
      ),
    );

    const user = userEvent.setup();
    renderAt('/journal');
    await user.type(await screen.findByLabelText(/write your entry/i), 'Work was heavy and I could not sleep.');
    await user.click(screen.getByRole('button', { name: /send entry/i }));

    expect((await screen.findAllByText(/what was the hardest part/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/via test\/model/i).length).toBeGreaterThan(0);
  });

  it('falls back to the on-device reading when the model fails', async () => {
    seedStore({ settings: { onboarded: true, displayName: 'Kofi', ai: { enabled: true, model: 'test/model' } } });
    setHfToken('hf_token');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));

    const user = userEvent.setup();
    renderAt('/journal');
    await user.type(await screen.findByLabelText(/write your entry/i), 'Work was heavy and I could not sleep.');
    await user.click(screen.getByRole('button', { name: /send entry/i }));

    expect((await screen.findAllByText(/on-device reading/i)).length).toBeGreaterThan(0);
  });

  it('does not call the model for a high-risk entry', async () => {
    seedStore({ settings: { onboarded: true, displayName: 'Kofi', ai: { enabled: true, model: 'test/model' } } });
    setHfToken('hf_token');
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderAt('/journal');
    await user.type(await screen.findByLabelText(/write your entry/i), 'I want to die.');
    await user.click(screen.getByRole('button', { name: /send entry/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/0800 678 678/i).length).toBeGreaterThan(0);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
