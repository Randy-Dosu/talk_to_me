import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { isCloudConfigured } from './firebase';
import {
  backupStore,
  eraseCloud,
  restoreStore,
  signInWithEmail,
  signOutCloud,
  signUpWithEmail,
  watchAuth,
  type CloudUser,
} from './cloudSync';
import { mergeById, settingsFromCloud } from './cloudModel';

export type CloudPhase = 'not-configured' | 'signed-out' | 'signed-in';

export function useCloud() {
  const { state, updateSettings, importRemote } = useStore();
  const [user, setUser] = useState<CloudUser | null>(null);
  const [ready, setReady] = useState(!isCloudConfigured);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoTimer = useRef<number | null>(null);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (!isCloudConfigured) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void watchAuth((next) => {
      if (cancelled) return;
      setUser(next);
      setReady(true);
    }).then((stop) => {
      if (cancelled) stop();
      else unsubscribe = stop;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const run = useCallback(async <T,>(label: string, action: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      setMessage(label);
      return result;
    } catch (err) {
      const code = err instanceof Error ? err.message : 'unknown';
      setError(
        code === 'not-configured'
          ? 'No Firebase project is configured in this build.'
          : code === 'auth/invalid-credential' || code === 'auth/wrong-password'
            ? 'That email and password do not match an account.'
            : code === 'auth/email-already-in-use'
              ? 'That email already has an account — sign in instead.'
              : code === 'auth/weak-password'
                ? 'Use at least six characters for the password.'
                : code === 'auth/invalid-email'
                  ? 'That email address does not look right.'
                  : code === 'auth/network-request-failed'
                    ? 'Firebase could not be reached. Check the connection or use the emulator.'
                    : 'Cloud request failed. Nothing on this device changed.',
      );
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = (email: string, password: string) =>
    run('Signed in.', () => signInWithEmail(email, password));

  const signUp = (email: string, password: string) =>
    run('Account created and signed in.', () => signUpWithEmail(email, password));

  const signOut = async () => {
    await signOutCloud();
    updateSettings({ cloudEnabled: false });
    setMessage('Signed out. Cloud backup is off.');
    setUser(null);
  };

  const backup = () =>
    run('Backed up to Firestore.', async () => {
      const result = await backupStore(state);
      updateSettings({ lastBackupAt: result.at });
      return result;
    });

  const restore = () =>
    run('Restored from Firestore.', async () => {
      const payload = await restoreStore();
      if (!payload) throw new Error('empty-cloud');
      importRemote({
        entries: mergeById(state.entries, payload.entries),
        checkins: mergeById(state.checkins, payload.checkins),
        settings: settingsFromCloud(payload.root.settings, state.settings),
        safetyPlan: payload.root.safetyPlan,
      });
      return payload;
    });

  const erase = () =>
    run('Cloud copy deleted.', async () => {
      await eraseCloud();
      updateSettings({ cloudEnabled: false, lastBackupAt: null });
    });

  // Debounced auto-backup, only when the person has turned it on.
  useEffect(() => {
    if (!user || !state.settings.cloudEnabled) return;
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    autoTimer.current = window.setTimeout(() => {
      void backupStore(latest.current)
        .then((result) => updateSettings({ lastBackupAt: result.at }))
        .catch(() => setError('Auto-backup failed. Your entries are still on this device.'));
    }, 2500);
    return () => {
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
    };
  }, [user, state.settings.cloudEnabled, state.entries, state.checkins, updateSettings]);

  const phase: CloudPhase = !isCloudConfigured ? 'not-configured' : user ? 'signed-in' : 'signed-out';

  return {
    configured: isCloudConfigured,
    phase,
    ready,
    user,
    busy,
    message,
    error,
    signIn,
    signUp,
    signOut,
    backup,
    restore,
    erase,
    clearError: () => setError(null),
    lastBackupAt: state.settings.lastBackupAt,
    enabled: state.settings.cloudEnabled,
    setEnabled: (enabled: boolean) => updateSettings({ cloudEnabled: enabled }),
  };
}
