import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { StoreProvider } from '../data/store';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StoreProvider>
        <App />
      </StoreProvider>
    </MemoryRouter>,
  );
}

async function skipOnboarding(user: ReturnType<typeof userEvent.setup>) {
  expect(await screen.findByText(/set up in one page/i)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: /skip for now/i }));
}

async function sendEntry(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /send entry/i }));
}

async function writeEntry(user: ReturnType<typeof userEvent.setup>, text: string) {
  const box = await screen.findByLabelText(/write your entry/i);
  await user.click(box);
  await user.type(box, text);
}

let consoleErrors: unknown[][] = [];

beforeEach(() => {
  window.localStorage.clear();
  consoleErrors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    consoleErrors.push(args);
  });
});

afterEach(() => {
  const messages = consoleErrors.map((args) => args.map(String).join(' '));
  vi.restoreAllMocks();
  // React warnings and act() noise are bugs too: nothing should reach the console.
  expect(messages).toEqual([]);
});

describe('journalling flow', () => {
  it('onboards, saves an entry and shows it back', async () => {
    const user = userEvent.setup();
    renderAt('/journal');

    await skipOnboarding(user);

    await writeEntry(user, 'Today was heavy but I showed up.');
    await sendEntry(user);

    // The entry is stored and rendered in the "Today" list.
    await waitFor(() => {
      const matches = screen.getAllByText(/today was heavy but i showed up\./i);
      expect(matches.length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/distress/i).length).toBeGreaterThan(0);

    const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(stored.entries).toHaveLength(1);
    expect(stored.entries[0].analysis.moodBand).toBeTruthy();
  });

  it('shows the crisis card automatically when risk language is typed', async () => {
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);

    await writeEntry(user, 'I do not want to be here anymore. I am tired of this life.');
    await sendEntry(user);

    await waitFor(
      () => {
        expect(screen.getByText(/this sounds heavy\. you do not have to sit with it alone/i)).toBeTruthy();
      },
      { timeout: 3000 },
    );
    expect(screen.getAllByText('0800 678 678').length).toBeGreaterThan(0);
    expect(screen.getAllByText('112').length).toBeGreaterThan(0);
  });

  it('lets the writer undo a mood correction', async () => {
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);
    await writeEntry(user, 'A quiet day, mostly fine.');
    await sendEntry(user);

    await user.click(screen.getByRole('button', { name: /not quite/i }));
    await user.click(screen.getByRole('button', { name: /^heavy$/i }));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
      expect(stored.entries[0].feltMood).toBe('heavy');
    });

    await user.click(screen.getByRole('button', { name: /not quite/i }));
    await user.click(screen.getByRole('button', { name: /use the reading/i }));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
      expect(stored.entries[0].feltMood).toBeUndefined();
    });
  });

  it('loads and clears sample data without leaving demo artefacts behind', async () => {
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);
    await user.click(await screen.findByRole('button', { name: /fictional sample data/i }));

    expect(await screen.findByText(/sample data is loaded/i)).toBeTruthy();
    let stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(stored.demoMode).toBe(true);
    expect(stored.entries.length).toBeGreaterThan(10);

    await user.click(screen.getByRole('button', { name: /clear sample data/i }));
    await waitFor(() => {
      stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
      expect(stored.demoMode).toBe(false);
      expect(stored.entries).toHaveLength(0);
      expect(stored.checkins).toHaveLength(0);
      expect(stored.safetyPlan.people).toHaveLength(0);
    });
  });

  it('offers immediate guidance when the entry is about someone else', async () => {
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);
    await writeEntry(user, "My friend told me he wants to kill himself and I don't know what to do.");
    await sendEntry(user);

    expect((await screen.findAllByText(/about someone else/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0800 678 678/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /how to talk to a friend/i }).length).toBeGreaterThan(0);
  });

  it('disables saving an empty entry', async () => {
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);
    const button = screen.getByRole('button', { name: /send entry/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('lets the writer correct the mood band', async () => {
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);
    await writeEntry(user, 'I am fine, just tired.');
    await sendEntry(user);

    await user.click(screen.getByRole('button', { name: /not quite/i }));
    await user.click(screen.getByRole('button', { name: /^heavy$/i }));

    const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(stored.entries[0].feltMood).toBe('heavy');
  });
});

describe('clinical check-in', () => {
  it('scores the PHQ-9, gates item 9 and raises the crisis card', async () => {
    const user = userEvent.setup();
    renderAt('/check-in');

    const options = screen.getAllByRole('button', { name: /several days/i });
    expect(options).toHaveLength(9);
    for (const option of options) await user.click(option);

    await user.click(screen.getByRole('button', { name: /save check-in/i }));

    expect(await screen.findByText(/phq-9: 9 of 27/i)).toBeTruthy();
    expect(screen.getByText(/please talk to a person now/i)).toBeTruthy();

    const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(stored.checkins[0].score).toBe(9);
    expect(stored.checkins[0].safetyFlag).toBe(true);
  });

  it('does not raise the crisis card when item 9 is zero', async () => {
    const user = userEvent.setup();
    renderAt('/check-in');

    const none = screen.getAllByRole('button', { name: /not at all/i });
    for (const option of none) await user.click(option);
    await user.click(screen.getByRole('button', { name: /save check-in/i }));

    expect(await screen.findByText(/phq-9: 0 of 27/i)).toBeTruthy();
    expect(screen.queryByText(/please talk to a person now/i)).toBeNull();
  });

  it('switches to the GAD-7', async () => {
    const user = userEvent.setup();
    renderAt('/check-in');
    await user.click(screen.getByRole('button', { name: /gad-7 · anxiety/i }));
    expect(screen.getByText(/generalised anxiety disorder/i)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /not at all/i })).toHaveLength(7);
  });
});

describe('safety and privacy', () => {
  it('adds items to the safety plan and persists them', async () => {
    const user = userEvent.setup();
    renderAt('/safety');

    const input = screen.getByPlaceholderText(/waking at 3am/i);
    await user.type(input, 'Going quiet for days{Enter}');

    const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    await waitFor(() => {
      expect(stored.safetyPlan.warningSigns).toContain('Going quiet for days');
    });
  });

  it('saves a trusted contact and drafts a message without journal text', async () => {
    const user = userEvent.setup();
    const first = renderAt('/journal');
    await skipOnboarding(user);
    await writeEntry(user, 'Secret detail: I cried in the trotro today.');
    await sendEntry(user);
    await waitFor(() => expect(screen.getAllByText(/cried in the trotro/i).length).toBeGreaterThan(0));
    first.unmount();

    renderAt('/trusted');
    await user.type(screen.getByLabelText(/^name$/i), 'Auntie Efua');
    await user.type(screen.getByLabelText(/phone number/i), '+233240000000');

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]);
    await user.click(screen.getByRole('button', { name: /save trusted contact/i }));

    expect(await screen.findByText(/saved on this device/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /save as draft/i }));
    await waitFor(() => {
      expect(screen.getByText(/preview only/i)).toBeTruthy();
    });

    const draftText = document.body.textContent ?? '';
    expect(draftText).not.toContain('cried in the trotro');
    expect(draftText).toContain('No journal text is included');
  });

  it('wipes everything after explicit confirmation', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/journal');
    await skipOnboarding(user);
    await writeEntry(user, 'Something private I do not want kept.');
    await sendEntry(user);
    await waitFor(() => expect(window.localStorage.getItem('nkommo.store.v1')).toBeTruthy());
    unmount();

    renderAt('/privacy');
    await user.click(screen.getByRole('button', { name: /erase all data/i }));
    await user.click(screen.getByRole('button', { name: /yes, erase permanently/i }));

    expect(window.localStorage.getItem('nkommo.store.v1')).toBeNull();
  });
});

describe('route smoke tests', () => {
  const routes = [
    ['/', /set up in one page/i],
    ['/journal', /set up in one page/i],
    ['/welcome', /say it here first/i],
    ['/patterns', /pattern|the pattern needs/i],
    ['/check-in', /two minutes, nine questions/i],
    ['/safety', /help that answers, tonight/i],
    ['/trusted', /a person, not an algorithm/i],
    ['/model', /what the reading can do/i],
    ['/research', /what we read before we built this/i],
    ['/privacy', /nobody is reading this over your shoulder/i],
    ['/about', /built for the conversation we are not having/i],
    ['/does-not-exist', /this page is not here/i],
  ] as const;

  for (const [path, pattern] of routes) {
    it(`renders ${path}`, async () => {
      const consoleErrors: unknown[] = [];
      const original = console.error;
      console.error = (...args: unknown[]) => {
        consoleErrors.push(args);
      };
      try {
        renderAt(path);
        expect((await screen.findAllByText(pattern)).length).toBeGreaterThan(0);
        expect((document.body.textContent ?? '').length).toBeGreaterThan(120);
      } finally {
        console.error = original;
      }
      const fatal = consoleErrors.filter((args) =>
        String((args as unknown[])[0] ?? '').includes('The above error occurred'),
      );
      expect(fatal).toEqual([]);
    });
  }
});

describe('navigation', () => {
  it('gets from the landing page to the journal and the model card', async () => {
    const user = userEvent.setup();
    renderAt('/welcome');

    await user.click(screen.getAllByRole('link', { name: /start privately/i })[0]);
    expect((await screen.findAllByText(/set up in one page|what should i call you/i)).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('link', { name: /model card & evaluation|model card/i })[0]);
    expect(await screen.findByText(/what the reading can do/i)).toBeTruthy();
  });

  it('shows the demo reading on the landing form', async () => {
    const user = userEvent.setup();
    renderAt('/welcome');
    const box = screen.getByLabelText(/sample journal entry/i);
    await user.clear(box);
    await user.type(box, 'I feel hopeless and alone.');
    await waitFor(() => {
      expect(screen.getAllByText(/^mood$/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/distress load/i)).toBeTruthy();
    });
  });
});

describe('voice input', () => {
  class FakeRecognition {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    processLocally = false;
    onstart: (() => void) | null = null;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start() {
      this.onstart?.();
      window.setTimeout(() => {
        this.onresult?.({
          resultIndex: 0,
          results: { length: 1, 0: { isFinal: true, 0: { transcript: 'I spoke this into the app.', confidence: 0.94 }, length: 1 } },
        });
      }, 0);
    }
    stop() {
      this.onend?.();
    }
    abort() {
      /* noop */
    }
  }

  afterEach(() => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  it('turns speech into entry text and marks the entry as spoken', async () => {
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRecognition;
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);

    await user.click(screen.getByRole('button', { name: /speak/i }));
    expect(await screen.findByRole('dialog', { name: /speak your entry/i })).toBeTruthy();

    const transcript = await screen.findByDisplayValue(/i spoke this into the app/i);
    expect(transcript).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /use these words/i }));
    const box = await screen.findByLabelText(/write your entry/i);
    expect((box as HTMLTextAreaElement).value).toMatch(/i spoke this into the app/i);

    await sendEntry(user);
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
      expect(stored.entries[0].source).toBe('voice');
      expect(stored.entries[0].text).toMatch(/i spoke this into the app/i);
    });
  });

  it('explains itself when the browser cannot transcribe', async () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);

    await user.click(screen.getByRole('button', { name: /speak/i }));
    expect(await screen.findByText(/voice input is not available in this browser/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /type/i }));
    expect(screen.queryByRole('dialog', { name: /speak your entry/i })).toBeNull();
  });
});

describe('signup', () => {
  it('requires a name and the acknowledgement before it will start', async () => {
    const user = userEvent.setup();
    renderAt('/signup');

    const start = screen.getByRole('button', { name: /start writing/i });
    expect((start as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByLabelText(/what should i call you/i), 'Kofi');
    expect((start as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole('checkbox', { name: /screening aid/i }));
    expect((start as HTMLButtonElement).disabled).toBe(false);
  });

  it('takes the name, language and trusted contact once, then opens the chat', async () => {
    const user = userEvent.setup();
    renderAt('/signup');

    await user.type(screen.getByLabelText(/what should i call you/i), 'Kofi');
    await user.click(screen.getByRole('button', { name: /english \+ twi/i }));
    await user.type(screen.getByLabelText(/trusted contact name/i), 'Auntie Efua');
    await user.type(screen.getByLabelText(/trusted contact phone/i), '+233240000000');
    await user.click(screen.getByRole('checkbox', { name: /they have agreed/i }));
    await user.click(screen.getByRole('checkbox', { name: /screening aid/i }));
    await user.click(screen.getByRole('button', { name: /start writing/i }));

    expect(await screen.findByLabelText(/write your entry/i)).toBeTruthy();
    expect(screen.getAllByText(/kofi/i).length).toBeGreaterThan(0);

    const stored = JSON.parse(window.localStorage.getItem('nkommo.store.v1') ?? '{}');
    expect(stored.settings.onboarded).toBe(true);
    expect(stored.settings.language).toBe('tw-en');
    expect(stored.settings.trusted.name).toBe('Auntie Efua');
    expect(stored.safetyPlan.people[0].name).toBe('Auntie Efua');
  });

  it('sends the first message and answers it in the chat', async () => {
    const user = userEvent.setup();
    renderAt('/journal');
    await skipOnboarding(user);

    await writeEntry(user, 'Today was heavy but I showed up.');
    await sendEntry(user);

    expect((await screen.findAllByText(/today was heavy but i showed up/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/distress/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /send entry/i })).toBeTruthy();
  });
});
