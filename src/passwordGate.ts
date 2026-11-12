const PASSWORD_HASH = '122880f3170baa6b81eedf3819edb9008f05da29a8c122c2229b207b88bc10fb';
const STORAGE_KEY = 'trade-cert-auth';

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Blocks the page behind a password overlay (casual deterrent only — the hash is public in the bundle). */
export function ensureUnlocked(): Promise<void> {
  if (localStorage.getItem(STORAGE_KEY) === PASSWORD_HASH) return Promise.resolve();

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'password-gate';
    overlay.innerHTML = `
      <form class="password-gate-card">
        <h1>Trade Certificate</h1>
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
        if (hash === PASSWORD_HASH) {
          localStorage.setItem(STORAGE_KEY, hash);
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
