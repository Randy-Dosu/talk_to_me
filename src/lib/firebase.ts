/**
 * Lazy Firebase bootstrap.
 *
 * Nothing is imported from the SDK until a project is configured, so the
 * offline build stays small and no request is made. Configuration comes from
 * VITE_FIREBASE_* variables (see .env.example); the emulator flag points the
 * client at localhost so the backend can be tested without a cloud project.
 */

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export function firebaseConfig(): FirebaseConfig | null {
  const apiKey = (import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim();
  const authDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '').trim();
  const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '').trim();
  const appId = (import.meta.env.VITE_FIREBASE_APP_ID ?? '').trim();
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '').trim() || undefined,
    messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '').trim() || undefined,
  };
}

export const isCloudConfigured = Boolean(firebaseConfig());

export const usingEmulator = (import.meta.env.VITE_FIREBASE_EMULATOR ?? '') === '1';

export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let pending: Promise<FirebaseHandles | null> | null = null;

export function getFirebase(): Promise<FirebaseHandles | null> {
  const config = firebaseConfig();
  if (!config) return Promise.resolve(null);
  if (!pending) {
    pending = (async () => {
      const [appMod, authMod, dbMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = appMod.getApps().length > 0 ? appMod.getApps()[0] : appMod.initializeApp(config);
      const auth = authMod.getAuth(app);
      const db = dbMod.getFirestore(app);

      if (usingEmulator) {
        try {
          authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        } catch {
          // already connected
        }
        try {
          dbMod.connectFirestoreEmulator(db, '127.0.0.1', 8080);
        } catch {
          // already connected
        }
      }
      return { app, auth, db };
    })();
  }
  return pending;
}
