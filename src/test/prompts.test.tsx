import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { StoreProvider } from '../data/store';
import { analyse } from '../engine/analyze';
import type { JournalEntry } from '../engine/types';
import {
  EVENING_STARTERS,
  MORNING_STARTERS,
  STATE_STARTERS,
  daySeed,
  openerFor,
  pickStarters,
  stateFromAnalysis,
  stateFromEntries,
} from '../data/prompts';
import { dismiss, formatClock, isDismissed, minutesUntil, nextSlot, promptWindow } from '../lib/dayPrompter';

function entry(text: string, id = 'e1'): JournalEntry {
  return {
    id,
    createdAt: new Date().toISOString(),
    text,
    source: 'typed',
    analysis: analyse(text),
  };
}

function settings() {
  return JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}').settings;
}

describe('starter bank', () => {
  it('offers three unique starters, two time-based and one state-based', () => {
    const picks = pickStarters('evening', 'anxious', 11);
    expect(picks).toHaveLength(3);
    expect(new Set(picks.map((p) => p.id)).size).toBe(3);

    const seed = 11;
    const timePool = EVENING_STARTERS;
    expect(picks[0].id).toBe(timePool[seed % timePool.length].id);
    expect(picks[1].id).toBe(timePool[(seed + 3) % timePool.length].id);
    expect(picks[2].mechanism).toBe(STATE_STARTERS.anxious[0].mechanism);
    expect(STATE_STARTERS.anxious.map((s) => s.id)).toContain(picks[2].id);
  });

  it('is deterministic for a given day and changes across days', () => {
    const a = pickStarters('morning', 'mixed', daySeed(new Date('2026-11-05T08:00:00')));
    const b = pickStarters('morning', 'mixed', daySeed(new Date('2026-11-05T21:00:00')));
    const c = pickStarters('morning', 'mixed', daySeed(new Date('2026-11-12T08:00:00')));
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
    expect(a.map((s) => s.id)).not.toEqual(c.map((s) => s.id));
  });

  it('picks from the right time pool', () => {
    const morning = pickStarters('morning', 'good', 4);
    const evening = pickStarters('evening', 'good', 4);
    expect(MORNING_STARTERS.map((s) => s.id)).toContain(morning[0].id);
    expect(EVENING_STARTERS.map((s) => s.id)).toContain(evening[0].id);
  });

  it('maps recent entries to a state without diagnosing', () => {
    expect(stateFromEntries([])).toBe('mixed');
    const heavy = stateFromAnalysis(analyse('I feel worthless and hopeless. Nothing matters and I cannot sleep.'));
    expect(heavy).toBe('low');
    const bright = (() => {
      const analysis = analyse('Today was a good day. I felt calm, grateful and proud of what I finished.');
      return stateFromAnalysis({ ...analysis, moodBand: 'bright', distress: 10, risk: { ...analysis.risk, level: 'none' } } as JournalEntry['analysis']);
    })();
    expect(bright).toBe('good');
  });

  it('uses two low entries in the last three to soften the opener', () => {
    const low = 'I feel worthless and hopeless and I cannot get out of bed.';
    expect(stateFromEntries([entry(low, 'a'), entry(low, 'b')])).toBe('low');
    expect(openerFor('evening', 'low', 1)).toMatch(/no need to make it neat/i);
    expect(openerFor('evening', 'good', 1)).toMatch(/good days deserve detail/i);
  });
});

describe('time-of-day prompting', () => {
  it('opens a morning window early and an evening window late', () => {
    expect(promptWindow(new Date('2026-11-05T08:00:00'))).toBe('morning');
    expect(promptWindow(new Date('2026-11-05T20:00:00'))).toBe('evening');
    expect(promptWindow(new Date('2026-11-05T02:00:00'))).toBeNull();
    expect(promptWindow(new Date('2026-11-05T14:00:00'))).toBeNull();
  });

  it('dismisses a slot once per day only', () => {
    const evening = new Date('2026-11-05T20:05:00');
    expect(isDismissed('evening', evening)).toBe(false);
    dismiss('evening', evening);
    expect(isDismissed('evening', evening)).toBe(true);
    expect(isDismissed('evening', new Date('2026-11-05T21:30:00'))).toBe(true);
    expect(isDismissed('morning', evening)).toBe(false);
    expect(isDismissed('evening', new Date('2026-11-06T20:05:00'))).toBe(false);
  });

  it('finds the next slot across midnight', () => {
    const settings = { remindersEnabled: true, morningTime: '07:30', eveningTime: '20:30' } as never;
    const evening = nextSlot(settings, new Date('2026-11-05T09:00:00'));
    expect(evening?.kind).toBe('evening');
    expect(evening?.at.getHours()).toBe(20);

    const morning = nextSlot(settings, new Date('2026-11-05T21:00:00'));
    expect(morning?.kind).toBe('morning');
    expect(morning?.at.getDate()).toBe(6);
    expect(nextSlot({ remindersEnabled: false, morningTime: '07:30', eveningTime: '20:30' } as never)).toBeNull();
  });

  it('reads and formats clock values', () => {
    expect(formatClock('20:30')).toBe('8:30 pm');
    expect(formatClock('07:05')).toBe('7:05 am');
    expect(formatClock('12:00')).toBe('12:00 pm');
    expect(formatClock('nonsense')).toBe('nonsense');
    expect(minutesUntil('20:30', new Date('2026-11-05T20:00:00'))).toBe(30);
    expect(minutesUntil('20:30', new Date('2026-11-05T21:00:00'))).toBe(-30);
    expect(minutesUntil('99:99')).toBeNull();
  });
});

describe('prompter in the app', () => {
  let consoleErrors: unknown[][] = [];

  beforeEach(() => {
    window.localStorage.clear();
    consoleErrors = [];
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      consoleErrors.push(args);
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-05T20:10:00'));
  });

  afterEach(() => {
    const messages = consoleErrors.map((args) => args.map(String).join(' '));
    vi.useRealTimers();
    vi.restoreAllMocks();
    expect(messages).toEqual([]);
  });

  function renderChat() {
    return render(
      <MemoryRouter initialEntries={['/journal']}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </MemoryRouter>,
    );
  }

  async function enterChat() {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(await screen.findByRole('button', { name: /skip for now/i }));
    await screen.findByLabelText(/write your entry/i);
    return user;
  }

  it('replaces the Akwaaba greeting with a period greeting and a starter', async () => {
    renderChat();
    await enterChat();

    expect(screen.queryByText(/akwaaba|maakye|maaha|maadwo/i)).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/evening/i);
    // The prompter carries the starter questions; the empty state stays bare.
    const card = await screen.findByLabelText(/evening check-in/i);
    const rows = within(card)
      .getAllByRole('button')
      .filter((button) => button.textContent?.includes('?'));
    expect(rows).toHaveLength(3);
  });

  it('offers starter chips in the empty state outside a prompt window', async () => {
    vi.setSystemTime(new Date('2026-11-05T14:00:00'));
    renderChat();
    await enterChat();
    expect(screen.queryByLabelText(/evening check-in|morning plan/i)).toBeNull();
    const labels = screen.getAllByRole('button').map((button) => button.textContent?.trim() ?? '');
    const expected = pickStarters('morning', 'mixed', daySeed(new Date('2026-11-05T14:00:00')));
    for (const starter of expected) expect(labels).toContain(starter.text);
  });

  it('shows the evening prompter, prefills the composer from a starter, and stays dismissed', async () => {
    const { unmount } = renderChat();
    const user = await enterChat();

    expect(await screen.findByLabelText(/evening check-in/i)).toBeTruthy();
    expect(screen.getByText(/close the day/i)).toBeTruthy();

    const starter = pickStarters('evening', 'mixed', daySeed(new Date('2026-11-05T20:10:00')))[0];
    await user.click(screen.getAllByRole('button', { name: new RegExp(starter.text.replace(/[?.]/g, '.')) })[0]);

    const box = screen.getByLabelText(/write your entry/i) as HTMLTextAreaElement;
    await waitFor(() => expect(box.value.startsWith(starter.text)).toBe(true));

    await user.click(screen.getByRole('button', { name: /dismiss for today/i }));
    await waitFor(() => expect(screen.queryByLabelText(/evening check-in/i)).toBeNull());
    expect(isDismissed('evening', new Date('2026-11-05T20:10:00'))).toBe(true);

    unmount();
    renderChat();
    await screen.findByLabelText(/write your entry/i);
    expect(screen.queryByLabelText(/evening check-in/i)).toBeNull();
  });

  it('shows a morning prompt before noon', async () => {
    vi.setSystemTime(new Date('2026-11-05T08:15:00'));
    renderChat();
    await enterChat();
    expect(await screen.findByLabelText(/morning plan/i)).toBeTruthy();
    expect(screen.getByText(/plan the day/i)).toBeTruthy();
  });

  it('lets settings carry both prompt times and the toggle', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByRole('heading', { name: /daily prompts/i });

    const morning = screen.getByLabelText(/morning plan/i) as HTMLInputElement;
    expect(morning.value).toBe('07:30');
    const evening = screen.getByLabelText(/evening check-in/i) as HTMLInputElement;
    expect(evening.value).toBe('20:30');

    await user.clear(evening);
    await user.type(evening, '21:15');
    expect(settings().eveningTime).toBe('21:15');

    await user.click(screen.getByRole('switch', { name: /show the prompter/i }));
    expect(settings().remindersEnabled).toBe(false);
    expect(screen.getByText(/notifications unavailable|turn on notifications/i)).toBeTruthy();
  });
});
