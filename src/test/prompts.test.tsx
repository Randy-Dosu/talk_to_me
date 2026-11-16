import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { StoreProvider } from '../data/store';
import { SIGNAL_QUESTIONS, questionFor, signalFromEntries } from '../data/prompts';
import { analyse } from '../engine/analyze';
import type { JournalEntry } from '../engine/types';
import { dismiss, formatClock, isDismissed, minutesUntil, nextSlot, promptWindow } from '../lib/dayPrompter';

function entry(text: string, id = 'e1'): JournalEntry {
  return { id, createdAt: new Date().toISOString(), text, source: 'typed', analysis: analyse(text) };
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

describe('the opening question', () => {
  it('is always a short question, with no advice and no suggested answer', () => {
    for (const pool of Object.values(SIGNAL_QUESTIONS)) {
      for (const questions of Object.values(pool)) {
        for (const text of questions) {
          expect(text.trim().endsWith('?')).toBe(true);
          expect(text.length).toBeLessThanOrEqual(80);
          expect(text).not.toMatch(/you should|try to|remember to|no need|slow is fine|deserve/i);
        }
      }
    }
  });

  it('changes with what the last entries read like', () => {
    const empty = questionFor({ kind: 'evening', entries: [], now: new Date('2026-11-05T20:00:00') });
    const heavy = questionFor({
      kind: 'evening',
      entries: [entry('I feel worthless and hopeless. I cannot sleep and nothing matters.', 'h1')],
      now: new Date('2026-11-05T20:00:00'),
    });
    const bright = questionFor({
      kind: 'evening',
      entries: [entry('Today was good. I felt calm, grateful and proud.', 'b1')],
      now: new Date('2026-11-05T20:00:00'),
    });

    const endsIn = (pool: string[], text: string) => pool.some((question) => text.endsWith(question));
    expect(endsIn(SIGNAL_QUESTIONS.steady.evening, empty)).toBe(true);
    expect(endsIn(SIGNAL_QUESTIONS.heavy.evening, heavy)).toBe(true);
    expect(endsIn(SIGNAL_QUESTIONS.bright.evening, bright)).toBe(true);
    expect(new Set([empty, heavy, bright]).size).toBe(3);
  });

  it('reads a signal from the last three entries', () => {
    const heavy = entry('I feel hopeless and worthless and cannot get out of bed.', 'h');
    const bright = 'Today was good. I felt calm, grateful and proud of what I finished.';
    expect(signalFromEntries([])).toBe('steady');
    expect(signalFromEntries([heavy, heavy])).toBe('heavy');
    expect(signalFromEntries([entry(bright, 'a'), entry(bright, 'b'), entry(bright, 'c')])).toBe('bright');
  });

  it('is stable within a moment and does not repeat itself back to back', () => {
    const ctx = { kind: 'morning' as const, entries: [], now: new Date('2026-11-05T08:00:00') };
    const first = questionFor(ctx);
    expect(questionFor(ctx)).toBe(first);
    expect(questionFor(ctx, first)).not.toBe(first);
  });

  it('asks different things on different days and hours', () => {
    const monday = questionFor({ kind: 'morning', entries: [], now: new Date('2026-11-02T08:00:00') });
    const friday = questionFor({ kind: 'morning', entries: [], now: new Date('2026-11-06T08:00:00') });
    const evening = questionFor({ kind: 'evening', entries: [], now: new Date('2026-11-02T20:00:00') });
    expect(monday).not.toBe(evening);
    expect(typeof friday).toBe('string');
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
    window.sessionStorage.clear();
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

  async function enterChat() {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(await screen.findByRole('button', { name: /skip for now/i }));
    await screen.findByLabelText(/write your entry/i);
    return user;
  }

  it('replaces the Akwaaba greeting with a period and one question', async () => {
    renderAt('/journal');
    await enterChat();

    expect(screen.queryByText(/akwaaba|maakye|maaha|maadwo/i)).toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/evening/i);

    const card = await screen.findByLabelText(/evening check-in/i);
    expect(within(card).getByText(/^evening$/i)).toBeTruthy();
    expect(within(card).getByText(questionFor({ kind: 'evening', entries: [], now: new Date('2026-11-05T20:10:00') }))).toBeTruthy();
    // No suggestion buttons anywhere: the only buttons are Write and dismiss.
    expect(screen.queryAllByRole('button', { name: /\?$/ })).toHaveLength(0);
    expect(within(card).getAllByRole('button').map((b) => b.textContent)).toEqual(['Write', '']);
  });

  it('starts writing without writing anything for the person, and stays dismissed', async () => {
    const { unmount } = renderAt('/journal');
    const user = await enterChat();

    const card = await screen.findByLabelText(/evening check-in/i);
    await user.click(within(card).getByRole('button', { name: /^write$/i }));

    const box = screen.getAllByLabelText(/write your entry/i)[0] as HTMLTextAreaElement;
    expect(box.value).toBe('');
    expect(document.activeElement).toBe(screen.getAllByLabelText(/write your entry/i)[0]);

    await user.click(screen.getByRole('button', { name: /dismiss for today/i }));
    await waitFor(() => expect(screen.queryByLabelText(/evening check-in/i)).toBeNull());
    expect(isDismissed('evening', new Date('2026-11-05T20:10:00'))).toBe(true);

    unmount();
    renderAt('/journal');
    await screen.findByLabelText(/write your entry/i);
    expect(screen.queryByLabelText(/evening check-in/i)).toBeNull();
  });

  it('shows a morning question before noon', async () => {
    vi.setSystemTime(new Date('2026-11-05T08:15:00'));
    renderAt('/journal');
    await enterChat();

    const card = await screen.findByLabelText(/morning plan/i);
    expect(within(card).getByText(/^morning$/i)).toBeTruthy();
    expect(within(card).getByText(questionFor({ kind: 'morning', entries: [], now: new Date('2026-11-05T08:15:00') }))).toBeTruthy();
  });

  it('asks the same question in the chat outside a prompt window, with no chips', async () => {
    vi.setSystemTime(new Date('2026-11-05T14:00:00'));
    renderAt('/journal');
    await enterChat();

    expect(screen.queryByLabelText(/evening check-in|morning plan/i)).toBeNull();
    expect(screen.getByText(questionFor({ kind: 'morning', entries: [], now: new Date('2026-11-05T14:00:00') }))).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /\?$/ })).toHaveLength(0);
  });

  it('lets settings carry both prompt times and the toggle', async () => {
    renderAt('/settings');
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByRole('heading', { name: /daily prompts/i });

    const morning = screen.getByLabelText(/morning plan/i) as HTMLInputElement;
    expect(morning.value).toBe('07:30');
    const evening = screen.getByLabelText(/evening check-in/i) as HTMLInputElement;
    expect(evening.value).toBe('20:30');

    await user.clear(evening);
    await user.type(evening, '21:15');
    const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(stored.settings.eveningTime).toBe('21:15');

    await user.click(screen.getByRole('switch', { name: /show the prompter/i }));
    const after = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(after.settings.remindersEnabled).toBe(false);
  });
});
