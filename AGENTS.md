# AGENTS.md

Guidance for AI coding agents working in this repo.

## What this is

A small static web app (`bmg-trading-post`) that generates two TTRPG certificate
images on an HTML `<canvas>`: a Coinlord's Caravan **Trade Certificate** and a
**Death Insurance** certificate. Users fill in a form in the sidebar; the canvas
redraws live; they export (download or copy to clipboard) a PNG/JPEG/WebP.

Stack: TypeScript + Vite, no framework, no backend. Deployed to GitHub Pages.

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
- `src/passwordGate.ts` — a **casual deterrent only**. `ensureUnlocked()`
  blocks the page behind a password overlay by comparing a SHA-256 hash that
  is public in the bundle. It is not real security; don't treat it as one, and
  don't paste the actual plaintext password into scripts/files/commits.
- `src/exportImage.ts`, `src/clipboard.ts`, `src/saveFile.ts` — export plumbing
  (canvas → blob, download, clipboard, File System Access API with a
  fallback).
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
sandbox, say so explicitly rather than claiming the UI was verified — the
password gate can also be bypassed for testing by setting
`localStorage['trade-cert-auth']` to the public hash constant in
`passwordGate.ts` (no need for the real plaintext password).

See `HANDOVER.md` for recent design decisions, known rough edges, and
possible next steps.
