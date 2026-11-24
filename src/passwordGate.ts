import { getPasswordHash } from './passwordConfig.ts';
import type { PasswordSlot } from './types.ts';

const GATE_TITLE: Record<PasswordSlot, string> = {
  'cert-gen': 'Trade Certificate',
  admin: 'Trade Request Admin',
};

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Blocks the page behind a password overlay (casual deterrent only — the hash is public in the bundle/Firestore). */
export async function ensureUnlocked(slot: PasswordSlot): Promise<void> {
  const storageKey = `trade-cert-auth-${slot}`;
  const expectedHash = await getPasswordHash(slot);
  if (localStorage.getItem(storageKey) === expectedHash) return;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'password-gate';
    overlay.innerHTML = `
      <form class="password-gate-card">
        <h1>${GATE_TITLE[slot]}</h1>
        <p>Enter the shared password to continue.</p>
        <label>Password<input type="password" id="gate-password" autocomplete="current-password" /></label>
        <div class="row">
          <button type="submit">Unlock</button>
        </div>
        <div class="password-gate-error" id="gate-error"></div>
      </form>
    `;
    document.body.append(overlay);

    const form = overlay.querySelector('form')!;
    const input = overlay.querySelector<HTMLInputElement>('#gate-password')!;
    const error = overlay.querySelector<HTMLDivElement>('#gate-error')!;
    input.focus();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void (async () => {
        const hash = await sha256Hex(input.value);
        if (hash === expectedHash) {
          localStorage.setItem(storageKey, hash);
          overlay.remove();
          resolve();
        } else {
          error.textContent = 'Incorrect password.';
          input.value = '';
          input.focus();
        }
      })();
    });
  });
}
