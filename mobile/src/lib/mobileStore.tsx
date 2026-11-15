import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyse } from '@shared/engine/analyze';
import { createCheckIn } from '@shared/engine/checkins';
import { id as newId } from '@shared/engine/id';
import type {
  AlertEvent,
  CheckIn,
  JournalEntry,
  MoodBand,
  SafetyPlan,
  ScaleId,
  Settings,
  StoreShape,
} from '@shared/engine/types';
import {
  DEFAULT_PLAN,
  DEFAULT_SETTINGS,
  DEFAULT_STORE,
  hydrateStoreShape,
  mergeBackupIntoStore,
} from './mobileCore';
import { syncDailyReminders } from './notifications';
import { setHfToken } from './hfMobile';

export { DEFAULT_PLAN, DEFAULT_SETTINGS, DEFAULT_STORE, hydrateStoreShape };
export const MOBILE_STORAGE_KEY = 'nkommo.mobile.store.v1';

export interface MobileStoreApi {
  ready: boolean;
  state: StoreShape;
  addEntry: (text: string, source?: 'typed' | 'voice') => JournalEntry | null;
  removeEntry: (entryId: string) => void;
  setFeltMood: (entryId: string, band: MoodBand | null) => void;
  addCheckIn: (scale: ScaleId, answers: number[]) => CheckIn;
  updateSettings: (patch: Partial<Settings>) => void;
  updatePlan: (patch: Partial<SafetyPlan>) => void;
  addAlert: (trigger: string, preview: string) => void;
  dismissAlert: (alertId: string) => void;
  importBackupJson: (rawJson: string) => { ok: boolean; entriesAdded: number; error?: string };
  exportJson: () => string;
  wipe: () => Promise<void>;
}

const StoreContext = createContext<MobileStoreApi | null>(null);

export function MobileStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreShape>(DEFAULT_STORE);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);
  const wiping = useRef(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(MOBILE_STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        setState(hydrateStoreShape(raw));
        hydrated.current = true;
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        hydrated.current = true;
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (wiping.current) {
      wiping.current = false;
      return;
    }
    AsyncStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  useEffect(() => {
    if (!hydrated.current) return;
    void syncDailyReminders(state.settings);
  }, [
    state.settings.remindersEnabled,
    state.settings.morningTime,
    state.settings.eveningTime,
  ]);

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

  const importBackupJson = useCallback(
    (rawJson: string): { ok: boolean; entriesAdded: number; error?: string } => {
      let outcome: { ok: boolean; entriesAdded: number; error?: string } = {
        ok: false,
        entriesAdded: 0,
      };
      setState((prev) => {
        const res = mergeBackupIntoStore(prev, rawJson);
        outcome = { ok: res.ok, entriesAdded: res.entriesAdded, error: res.error };
        return res.next;
      });
      return outcome;
    },
    [],
  );

  const exportJson = useCallback(() => {
    return JSON.stringify(
      {
        app: 'Nkommo',
        platform: 'mobile',
        exportedAt: new Date().toISOString(),
        note: 'Local export. Compatible with Nkommo web and mobile. Contains sensitive personal writing — handle with care.',
        ...state,
      },
      null,
      2,
    );
  }, [state]);

  const wipe = useCallback(async () => {
    wiping.current = true;
    setState({ ...DEFAULT_STORE, settings: { ...DEFAULT_SETTINGS }, safetyPlan: { ...DEFAULT_PLAN } });
    await setHfToken('');
    try {
      await AsyncStorage.multiRemove([
        MOBILE_STORAGE_KEY,
        'nkommo.mobile.slotHints.v1',
        'nkommo.mobile.lastQuestion',
      ]);
    } catch {
      // ignore
    }
  }, []);

  const api = useMemo<MobileStoreApi>(
    () => ({
      ready,
      state,
      addEntry,
      removeEntry,
      setFeltMood,
      addCheckIn,
      updateSettings,
      updatePlan,
      addAlert,
      dismissAlert,
      importBackupJson,
      exportJson,
      wipe,
    }),
    [
      ready,
      state,
      addEntry,
      removeEntry,
      setFeltMood,
      addCheckIn,
      updateSettings,
      updatePlan,
      addAlert,
      dismissAlert,
      importBackupJson,
      exportJson,
      wipe,
    ],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useMobileStore(): MobileStoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useMobileStore must be used inside MobileStoreProvider');
  return ctx;
}

export function useSortedMobileEntries(): JournalEntry[] {
  const { state } = useMobileStore();
  return useMemo(
    () =>
      [...state.entries].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [state.entries],
  );
}
