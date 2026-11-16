import { describe, expect, it } from 'vitest';
import { analyse } from '../engine/analyze';
import {
  buildMessages,
  DEFAULT_STORE,
  formatClock,
  hydrateStoreShape,
  localReflection,
  maySendToModel,
  mergeBackupIntoStore,
  nextSlot,
  promptWindow,
  sanitizeReply,
} from '../../mobile/src/lib/mobileCore';

describe('Nkommo mobile store & web backup compatibility', () => {
  it('starts completely empty with no fictional sample data', () => {
    const fresh = hydrateStoreShape(null);
    expect(fresh.entries).toEqual([]);
    expect(fresh.checkins).toEqual([]);
    expect(fresh.alerts).toEqual([]);
    expect(fresh.settings.onboarded).toBe(false);
  });

  it('hydrates and merges a web JSON export cleanly onto the phone', () => {
    const webEntry = {
      id: 'web-e1',
      createdAt: '2026-11-14T19:00:00.000Z',
      text: 'Chale today be rough small, workload plenty.',
      source: 'typed' as const,
      analysis: analyse('Chale today be rough small, workload plenty.'),
    };
    const webExport = JSON.stringify({
      app: 'Nkommo',
      version: 1,
      entries: [webEntry],
      checkins: [],
      settings: { displayName: 'Kwame', language: 'tw-en', onboarded: true },
      safetyPlan: {
        warningSigns: ['Skipping meals'],
        copingSteps: ['Evening walk'],
        people: [],
        places: [],
        reasons: ['My sister'],
        professional: '',
      },
    });

    const hydrated = hydrateStoreShape(webExport);
    expect(hydrated.entries).toHaveLength(1);
    expect(hydrated.entries[0].id).toBe('web-e1');
    expect(hydrated.settings.displayName).toBe('Kwame');
    expect(hydrated.safetyPlan.warningSigns).toEqual(['Skipping meals']);

    const merged = mergeBackupIntoStore(DEFAULT_STORE, webExport);
    expect(merged.ok).toBe(true);
    expect(merged.entriesAdded).toBe(1);
    expect(merged.next.entries[0].id).toBe('web-e1');
    expect(merged.next.settings.onboarded).toBe(true);
  });

  it('rejects malformed or empty backup payloads gracefully', () => {
    expect(mergeBackupIntoStore(DEFAULT_STORE, 'not json').ok).toBe(false);
    expect(mergeBackupIntoStore(DEFAULT_STORE, '{}').ok).toBe(false);
  });
});

describe('Nkommo mobile safety gates & HF adapter', () => {
  it('blocks crisis language from ever leaving the phone', () => {
    const crisisText = 'I want to end my life tonight, nothing matters anymore.';
    const reading = analyse(crisisText);
    expect(reading.risk.level).toBe('urgent');
    expect(maySendToModel(reading, crisisText)).toBe(false);
    expect(
      localReflection({
        id: 'c1',
        createdAt: new Date().toISOString(),
        text: crisisText,
        source: 'typed',
        analysis: reading,
      }),
    ).toMatch(/talk to a person now/i);
  });

  it('suppresses diagnostic claims from model replies', () => {
    expect(sanitizeReply('You have depression and need medication.')).toBeNull();
    expect(
      sanitizeReply('Nkommo: That sounds exhausting to carry all week. What part weighed most?'),
    ).toBe('That sounds exhausting to carry all week. What part weighed most?');
    const msgs = buildMessages('Work drained me today.', analyse('Work drained me today.'));
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
  });
});

describe('Nkommo mobile day prompter & reminder clock', () => {
  it('identifies morning/evening windows and computes the next reminder slot', () => {
    expect(promptWindow(new Date('2026-11-15T08:15:00'))).toBe('morning');
    expect(promptWindow(new Date('2026-11-15T19:30:00'))).toBe('evening');
    expect(promptWindow(new Date('2026-11-15T14:00:00'))).toBeNull();
    expect(formatClock('07:30')).toBe('7:30 am');
    expect(formatClock('20:30')).toBe('8:30 pm');
    const slot = nextSlot(DEFAULT_STORE.settings, new Date('2026-11-15T10:00:00'));
    expect(slot?.kind).toBe('evening');
  });
});
