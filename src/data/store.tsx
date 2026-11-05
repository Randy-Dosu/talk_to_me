/**
 * Local-first store.
 *
 * There is no backend and no analytics in this build. Everything a person
 * writes lives in this browser's localStorage and nowhere else. That is a
 * product decision (privacy under stigma) and it is also why a "trusted
 * contact" alert is a *preview* here: shipping real alerts requires an
 * encrypted relay, consent records and a human escalation policy — see
 * docs/ROADMAP.md Stage 6.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { analyse } from '../engine/analyze';
import { createCheckIn } from '../engine/checkins';
import { id as newId } from '../engine/id';
import type {
  AlertEvent,
  CheckIn,
  JournalEntry,
  MoodBand,
  ScaleId,
  Settings,
  SafetyPlan,
  StoreShape,
} from '../engine/types';
import { buildDemoStore } from './seed';

const STORAGE_KEY = 'nkommo.store.v1';
const STORE_VERSION = 1;

const DEFAULT_SETTINGS: Settings = {
  displayName: '',
  language: 'tw-en',
  remindersEnabled: true,
  reminderTime: '20:30',
  trusted: null,
  showResourcesOnOpen: false,
  onboarded: false,
  clinicianMode: false,
};

const DEFAULT_PLAN: SafetyPlan = {
  warningSigns: [],
  copingSteps: [],
  people: [],
  places: [],
  reasons: [],
  professional: '',
};

const DEFAULT_STORE: StoreShape = {
  version: STORE_VERSION,
  entries: [],
  checkins: [],
  settings: DEFAULT_SETTINGS,
  safetyPlan: DEFAULT_PLAN,
  alerts: [],
  demoMode: false,
};

function load(): StoreShape {
  if (typeof window === 'undefined') return DEFAULT_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STORE;
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      ...DEFAULT_STORE,
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      safetyPlan: { ...DEFAULT_PLAN, ...(parsed.safetyPlan ?? {}) },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      checkins: Array.isArray(parsed.checkins) ? parsed.checkins : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      version: STORE_VERSION,
    };
  } catch {
    return DEFAULT_STORE;
  }
}

export interface StoreApi {
  state: StoreShape;
  addEntry: (text: string, source?: 'typed' | 'voice') => JournalEntry | null;
  removeEntry: (entryId: string) => void;
  setFeltMood: (entryId: string, band: MoodBand | null) => void;
  addCheckIn: (scale: ScaleId, answers: number[]) => CheckIn;
  updateSettings: (patch: Partial<Settings>) => void;
  updatePlan: (patch: Partial<SafetyPlan>) => void;
  addAlert: (trigger: string, preview: string) => void;
  dismissAlert: (alertId: string) => void;
  loadDemo: () => void;
  clearDemo: () => void;
  wipe: () => void;
  exportJson: () => string;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreShape>(load);
  const firstRender = useRef(true);
  const erased = useRef(false);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    try {
      if (erased.current) {
        // A deliberate erase: leave no record behind, not even an empty one.
        erased.current = false;
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked (private mode). The session still works.
    }
  }, [state]);

  const addEntry = useCallback((text: string, source: 'typed' | 'voice' = 'typed') => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const now = new Date();
    const entry: JournalEntry = {
      id: newId(),
      createdAt: now.toISOString(),
      text: trimmed,
      source,
      analysis: analyse(trimmed, now),
    };
    setState((prev) => ({ ...prev, entries: [entry, ...prev.entries] }));
    return entry;
  }, []);

  const removeEntry = useCallback((entryId: string) => {
    setState((prev) => ({ ...prev, entries: prev.entries.filter((e) => e.id !== entryId) }));
  }, []);

  const setFeltMood = useCallback((entryId: string, band: MoodBand | null) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => {
        if (e.id !== entryId) return e;
        if (band === null) {
          const { feltMood: _discarded, ...rest } = e;
          return rest;
        }
        return { ...e, feltMood: band };
      }),
    }));
  }, []);

  const addCheckIn = useCallback((scale: ScaleId, answers: number[]) => {
    const checkin = createCheckIn(scale, answers);
    setState((prev) => ({ ...prev, checkins: [checkin, ...prev.checkins] }));
    return checkin;
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const updatePlan = useCallback((patch: Partial<SafetyPlan>) => {
    setState((prev) => ({ ...prev, safetyPlan: { ...prev.safetyPlan, ...patch } }));
  }, []);

  const addAlert = useCallback((trigger: string, preview: string) => {
    const alert: AlertEvent = {
      id: newId(),
      createdAt: new Date().toISOString(),
      trigger,
      channel: 'preview',
      preview,
      status: 'drafted',
    };
    setState((prev) => ({ ...prev, alerts: [alert, ...prev.alerts] }));
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) => (a.id === alertId ? { ...a, status: 'dismissed' } : a)),
    }));
  }, []);

  const loadDemo = useCallback(() => {
    const demo = buildDemoStore();
    setState((prev) => ({
      ...prev,
      entries: demo.entries,
      checkins: demo.checkins,
      alerts: demo.alerts,
      demoMode: true,
      settings: {
        ...prev.settings,
        displayName: prev.settings.displayName || 'Ama',
        onboarded: true,
      },
      safetyPlan: {
        warningSigns: ['Sleeping badly and waking at 3am', 'Going quiet, leaving messages on read', 'Saying "I am fine" when I am not'],
        copingSteps: ['Walk before the sun comes strong', 'Call Auntie Efua', 'Write one line even if it is ugly'],
        people: [{ name: 'Kwesi', phone: '+233 24 000 0000', note: 'Friend — listens without fixing' }],
        places: ['The quiet bench behind the church', 'My room with the window open'],
        reasons: ['My small sister', 'The way my mother laughs', 'I want to see what happens next'],
        professional: '',
      },
    }));
  }, []);

  const clearDemo = useCallback(() => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => !e.id.startsWith('demo-entry-')),
      checkins: prev.checkins.filter((c) => !c.id.startsWith('demo-')),
      alerts: [],
      demoMode: false,
      // The sample data seeded the plan too; leaving "Auntie Efua" behind
      // would quietly invent a contact for a real user.
      safetyPlan: { ...DEFAULT_PLAN },
    }));
  }, []);

  const wipe = useCallback(() => {
    erased.current = true;
    setState({ ...DEFAULT_STORE, settings: { ...DEFAULT_SETTINGS } });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const exportJson = useCallback(() => {
    return JSON.stringify(
      {
        app: 'Nkommo',
        exportedAt: new Date().toISOString(),
        note: 'Local export. Contains sensitive personal writing — handle with care.',
        ...state,
      },
      null,
      2,
    );
  }, [state]);

  const api = useMemo<StoreApi>(
    () => ({
      state,
      addEntry,
      removeEntry,
      setFeltMood,
      addCheckIn,
      updateSettings,
      updatePlan,
      addAlert,
      dismissAlert,
      loadDemo,
      clearDemo,
      wipe,
      exportJson,
    }),
    [state, addEntry, removeEntry, setFeltMood, addCheckIn, updateSettings, updatePlan, addAlert, dismissAlert, loadDemo, clearDemo, wipe, exportJson],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useSortedEntries(): JournalEntry[] {
  const { state } = useStore();
  return useMemo(
    () => [...state.entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.entries],
  );
}
