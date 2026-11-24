# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this is

A small static web app (`bmg-trading-post`) that generates two TTRPG certificate
images on an HTML `<canvas>`: a Coinlord's Caravan **Trade Certificate** and a
**Death Insurance** certificate. Users fill in a form in the sidebar; the canvas
redraws live; they export (download or copy to clipboard) a PNG/JPEG/WebP.

There are also two smaller pages: `player-form.html` lets a player submit a
3-transaction trade request (no password) and get back a shareable link; the
Zilchus-rep generator (`index.html`) picks that link up and prefills the
Trade tab. `admin.html` (separate password) lists/clears submitted requests
and can rotate either password at runtime.

Stack: TypeScript + Vite (multi-page build), no framework. Deployed to GitHub
Pages. The generator itself is still backend-free, but the player-request
flow talks directly to **Firebase Firestore** from the browser (see
`src/firebase.ts`) — the project's first runtime dependency and first
external service. See HANDOVER.md for the data model and the security
caveats that come with a client-only Firestore setup.

## Commands

- `npm run dev` — local dev server
- `npm run build` — `tsc` type-check, then `vite build` (fails on type errors)
- `npm run typecheck` — `tsc --noEmit` only
- `npm run preview` — serve the built `dist/` (base path is `/bmg-trading-post/`,
  so hit `http://localhost:<port>/bmg-trading-post/`)

There is no test suite and no linter configured. Always run `npm run build`
(or at least `npm run typecheck`) before considering a change done.

## Layout

- `index.html` — the single page: tab bar, sidebar form (per-cert panels +
  shared Logo/Export panels), and the `<canvas id="cert-canvas">`.
- `src/main.ts` — wires every input element to state, cookies, and the two
  render functions. This is the hub; most new UI controls get wired here.
- `src/certificateCanvas.ts` / `src/deathInsuranceCanvas.ts` — per-certificate
  `FIELD_LAYOUT` (hand-tuned x/y/fontSize against the background PNGs) and the
  `drawCertificate`/`drawDeathInsuranceCertificate` draw functions.
- `src/textLayout.ts` — shared canvas-text helpers: `fillTextTruncated`
  (single line, ellipsis-truncated), `wrapText` (multi-line, word-wraps and
  respects `\n` as hard breaks), `drawImageContained` (aspect-fit image), font
  helpers.
- `src/types.ts` — `CertificateFields`, `DeathInsuranceFields`, and other
  shared types. Keep form state typed through here.
- `src/cookies.ts` — tiny `getCookie`/`setCookie` (400-day, `path=/`). Used to
  persist a handful of fields/toggles across visits (see `main.ts` for the
  `*_COOKIE` constants and the load/listen pairs).
- `src/passwordGate.ts` — a **casual deterrent only**. `ensureUnlocked(slot)`
  blocks a page behind a password overlay by comparing a SHA-256 hash
  resolved via `src/passwordConfig.ts` (Firestore `config/passwords` doc,
  falling back to a hardcoded default hash per `PasswordSlot`). It is not
  real security; don't treat it as one, and don't paste the actual plaintext
  password into scripts/files/commits.
- `src/passwordConfig.ts` — `getPasswordHash`/`setPasswordHash` per
  `PasswordSlot` (`'cert-gen' | 'admin'`), backing the runtime password
  rotation in `admin.html`.
- `src/firebaseConfig.ts` / `src/firebase.ts` — the Firebase web config
  (public, not secret — see HANDOVER.md) and the shared `app`/`db` Firestore
  singleton every Firestore-touching module imports.
- `player-form.html` / `src/playerForm.ts` — the unauthenticated player
  request form; writes a `requests/{autoId}` doc and shows a summary + an
  `index.html#req=<id>` link.
- `admin.html` / `src/admin.ts` — gated by `ensureUnlocked('admin')`; lists,
  deletes, and clears `requests` docs, and hosts the password-rotation form.
- `src/exportImage.ts`, `src/clipboard.ts`, `src/saveFile.ts` — export plumbing
  (canvas → blob, download, clipboard, File System Access API with a
  fallback, plus plain-text clipboard copy for the player form's summary/link).
- `public/*.png` — certificate background art and logos, served as-is.
- `.github/workflows/deploy.yml` — builds and deploys `dist/` to GitHub Pages
  on every published GitHub Release (or manual dispatch). A version bump +
  `gh release create` is how changes actually go live; pushing to `master`
  alone does not deploy.

## Conventions worth following

- **Field layout tuning**: `FIELD_LAYOUT` objects in the two `*Canvas.ts`
  files are pixel coordinates eyeballed against the background cert images.
  If you add/move a field, you'll likely need to visually check it against
  the rendered canvas, not just trust the numbers.
- **Shared vs. per-cert state**: controls that apply to both certificates
  (Logo choice, the handwritten-signature toggle) live in their own `<section
  class="panel">` in `index.html` outside the two `cert-panels` divs, and are
  read once in `main.ts` and threaded into both draw calls.
- **Persistence**: only a few fields are cookie-persisted (Convention,
  Signoff, Death Signature, handwritten-style toggle) — intentionally, so
  re-opening the page doesn't just replay someone else's last character data
  wholesale. Follow the existing `getCookie`/`setCookie` + `addEventListener`
  pattern in `main.ts` rather than inventing a new storage mechanism.
- **"Clear fields" buttons** reset only the character-specific fields per tab,
  not the persistent shared ones — check `#clear-trade`/`#clear-death`
  handlers in `main.ts` before changing what counts as "persistent."
- No component framework: new UI = new element(s) in `index.html` +
  `document.querySelector` + `addEventListener` in `main.ts`. Keep that style
  rather than introducing one.

## Browser-based verification

There's no automated UI test. When you can, verify visually: run
`npm run build && npm run preview`, open
`http://localhost:<port>/bmg-trading-post/`, and check the canvas renders as
expected. If browser automation (e.g. Playwright) isn't available in your
sandbox, say so explicitly rather than claiming the UI was verified — a
password gate can also be bypassed for testing by setting
`localStorage['trade-cert-auth-<slot>']` (`<slot>` is `cert-gen` or `admin`)
to that slot's hash from `src/passwordConfig.ts`'s `DEFAULT_HASHES` (no need
for the real plaintext password). Exercising `player-form.html`/`admin.html`
end-to-end additionally requires a real Firebase project — see HANDOVER.md.

See `HANDOVER.md` for recent design decisions, known rough edges, and
possible next steps.
