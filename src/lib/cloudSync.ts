/**
 * Firestore sync. Everything here is opt-in and only runs once a person has
 * signed in and turned cloud backup on. The document tree is:
 *
 *   users/{uid}                 settings subset + safety plan
 *   users/{uid}/entries/{id}    journal entries, including the analysis
 *   users/{uid}/checkins/{id}   PHQ-9 / GAD-7 answers
 *
 * Rules (firestore.rules) allow a user to touch only their own tree.
 */

import type { StoreShape } from '../engine/types';
import type { CloudPayload, CloudRoot } from './cloudModel';
import { settingsForCloud } from './cloudModel';
import { getFirebase } from './firebase';

export interface CloudUser {
  uid: string;
  email: string | null;
}

export interface BackupResult {
  at: string;
  entries: number;
  checkins: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

export async function watchAuth(onUser: (user: CloudUser | null) => void): Promise<() => void> {
  const handles = await getFirebase();
  if (!handles) {
    onUser(null);
    return () => {};
  }
  const { onAuthStateChanged } = await import('firebase/auth');
  return onAuthStateChanged(handles.auth, (user) => {
    onUser(user ? { uid: user.uid, email: user.email } : null);
  });
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const handles = await getFirebase();
  if (!handles) throw new Error('not-configured');
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  await signInWithEmailAndPassword(handles.auth, email, password);
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const handles = await getFirebase();
  if (!handles) throw new Error('not-configured');
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  await createUserWithEmailAndPassword(handles.auth, email, password);
}

export async function signOutCloud(): Promise<void> {
  const handles = await getFirebase();
  if (!handles) return;
  const { signOut } = await import('firebase/auth');
  await signOut(handles.auth);
}

export async function backupStore(state: StoreShape): Promise<BackupResult> {
  const handles = await getFirebase();
  if (!handles) throw new Error('not-configured');
  const { currentUser } = handles.auth;
  if (!currentUser) throw new Error('signed-out');

  const { doc, setDoc, writeBatch } = await import('firebase/firestore');
  const uid = currentUser.uid;
  const at = new Date().toISOString();
  const root: CloudRoot = {
    version: 1,
    updatedAt: at,
    settings: settingsForCloud(state.settings),
    safetyPlan: state.safetyPlan,
  };

  await setDoc(doc(handles.db, 'users', uid), root, { merge: true });

  for (const group of chunk(state.entries, 400)) {
    const batch = writeBatch(handles.db);
    for (const entry of group) batch.set(doc(handles.db, 'users', uid, 'entries', entry.id), entry);
    await batch.commit();
  }
  for (const group of chunk(state.checkins, 400)) {
    const batch = writeBatch(handles.db);
    for (const checkin of group) batch.set(doc(handles.db, 'users', uid, 'checkins', checkin.id), checkin);
    await batch.commit();
  }

  return { at, entries: state.entries.length, checkins: state.checkins.length };
}

export async function restoreStore(): Promise<CloudPayload | null> {
  const handles = await getFirebase();
  if (!handles) throw new Error('not-configured');
  const { currentUser } = handles.auth;
  if (!currentUser) throw new Error('signed-out');

  const { collection, doc, getDoc, getDocs } = await import('firebase/firestore');
  const uid = currentUser.uid;
  const rootSnap = await getDoc(doc(handles.db, 'users', uid));
  if (!rootSnap.exists()) return null;

  const [entriesSnap, checkinsSnap] = await Promise.all([
    getDocs(collection(handles.db, 'users', uid, 'entries')),
    getDocs(collection(handles.db, 'users', uid, 'checkins')),
  ]);

  return {
    root: rootSnap.data() as CloudRoot,
    entries: entriesSnap.docs.map((d) => d.data() as CloudPayload['entries'][number]),
    checkins: checkinsSnap.docs.map((d) => d.data() as CloudPayload['checkins'][number]),
  };
}

export async function eraseCloud(): Promise<void> {
  const handles = await getFirebase();
  if (!handles) return;
  const { currentUser } = handles.auth;
  if (!currentUser) return;

  const { collection, deleteDoc, doc, getDocs } = await import('firebase/firestore');
  const uid = currentUser.uid;
  for (const name of ['entries', 'checkins'] as const) {
    const snap = await getDocs(collection(handles.db, 'users', uid, name));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(doc(handles.db, 'users', uid));
}
