import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase.ts';
import type { PasswordConfigDoc, PasswordSlot } from './types.ts';

// Hardcoded fallback hashes, used when Firestore is unreachable or the
// config doc/field hasn't been written yet. Same "casual deterrent, public
// hash" model as the rest of this app's password gate — not real security.
// Default admin password is "change-me-admin"; change it via the admin
// screen's password settings as soon as Firestore is set up.
const DEFAULT_HASHES: Record<PasswordSlot, string> = {
  'cert-gen': '122880f3170baa6b81eedf3819edb9008f05da29a8c122c2229b207b88bc10fb',
  admin: 'ba30f59c2ec033f40fcd0f8dc89c9765a4d4ed51ee5140e915a8b3ccd2b43986',
};

const FIELD_BY_SLOT: Record<PasswordSlot, keyof PasswordConfigDoc> = {
  'cert-gen': 'certGenHash',
  admin: 'adminHash',
};

export async function getPasswordHash(slot: PasswordSlot): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'config', 'passwords'));
    const field = (snap.data() as PasswordConfigDoc | undefined)?.[FIELD_BY_SLOT[slot]];
    if (typeof field === 'string' && field) return field;
  } catch {
    // offline, unreachable, or the doc doesn't exist yet — fall back below.
  }
  return DEFAULT_HASHES[slot];
}

export async function setPasswordHash(slot: PasswordSlot, newHash: string): Promise<void> {
  await setDoc(doc(db, 'config', 'passwords'), { [FIELD_BY_SLOT[slot]]: newHash }, { merge: true });
}
