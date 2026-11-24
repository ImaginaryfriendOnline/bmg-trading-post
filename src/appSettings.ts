import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.ts';
import type { AppSettingsDoc } from './types.ts';

export async function getDefaultConvention(): Promise<string | undefined> {
  try {
    const snap = await getDoc(doc(db, 'config', 'settings'));
    const value = (snap.data() as AppSettingsDoc | undefined)?.defaultConvention;
    return typeof value === 'string' && value ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function setDefaultConvention(value: string): Promise<void> {
  await setDoc(doc(db, 'config', 'settings'), { defaultConvention: value }, { merge: true });
}
