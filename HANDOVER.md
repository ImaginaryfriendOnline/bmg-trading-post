# HANDOVER.md

Running log of non-obvious design choices, open issues, and fixes for the
next agent (human or AI) working on this repo. Prepend new entries to the
top of **Recent changes**; keep **Known issues** current rather than letting
it rot.

## Known issues / rough edges

- **Password gate is not security.** `src/passwordGate.ts` only compares a
  SHA-256 hash that's public in the shipped bundle — it's a casual deterrent
  against randoms stumbling onto the page, not an access control. Don't
  assume it protects anything, and never commit the real plaintext password
  anywhere (scripts, test fixtures, docs). Earlier sessions found `/tmp`
  Playwright scripts with the plaintext password hardcoded — if you need to
  bypass the gate for testing, set `localStorage['trade-cert-auth']` to the
  hash constant from `passwordGate.ts` instead (see AGENTS.md).
- **No automated tests.** Verification has historically been "run
  `npm run build`, then visually check via `npm run preview` + a screenshot
  or Playwright walk-through." If you don't have browser automation
  available, say so explicitly instead of claiming the UI was checked.
- **`FIELD_LAYOUT` coordinates are hand-tuned**, not derived from the PSD/art
  source. Any change to the background cert PNGs (`public/*.png`,
  `Trading Post Cert.png`, `Death Insurance Cert.png` at repo root) risks
  drifting every field off its printed line; re-check visually after any art
  swap.
- **CI deploy workflow (`.github/workflows/deploy.yml`) emits deprecation
  warnings**: its actions (`checkout`, `configure-pages`, `setup-node`,
  `upload-pages-artifact`) are forced onto Node.js 24 despite being pinned to
  Node 20 in spirit, and `ubuntu-latest` moves to Ubuntu 26 on 2026-10-19.
  Nothing is broken yet; bumping `setup-node`'s `node-version` and watching
  for the runner image change is the open follow-up.
- **Deploys are release-gated, not push-gated.** Merging/pushing to `master`
  does not update the live GitHub Pages site — a GitHub Release (`published`
  event) or manual `workflow_dispatch` is required. Don't tell a user a
  change is "live" just because it was pushed.
- **Firestore access is open at the database level.** `player-form.html` /
  `admin.html` / the `#req=` prefill in `index.html` all talk to Firebase
  Firestore directly from the browser (`src/firebase.ts`, `src/firebaseConfig.ts`).
  There's no Firebase Auth, so the Security Rules (documented in the project's
  setup notes) allow `create` on `requests` by anyone and `read`/`delete` on
  `requests` plus `read`/`write` on `config` by anyone — Firestore rules can't
  meaningfully check a password hash without Auth. The admin password
  (`src/passwordConfig.ts`'s `admin` slot, gating `admin.html`) is a
  **UI-level casual deterrent only**, same trust model as the existing
  cert-gen gate — not a real access boundary. Anyone who extracts the
  Firebase web config from the bundle could hit the database directly via the
  SDK/REST API. Acceptable for this app's threat model; don't represent it as
  more secure than that.
- **`src/firebaseConfig.ts` ships with placeholder values** (`REPLACE_ME`)
  until a real Firebase project is created (console.firebase.google.com →
  new project → add a Web app → enable Firestore). Until that's done, every
  Firestore call (player request submission, `#req=` prefill, the admin list,
  password rotation) fails — the cert-gen/admin password gates still work via
  their hardcoded fallback hashes in `src/passwordConfig.ts`, but nothing
  database-backed does. See the project's Firebase setup notes for the
  Security Rules to paste in.
- **`firebase` is this project's first runtime dependency** (previously zero
  — `typescript`/`vite` were dev-only). It's also the first external network
  dependency the app has at runtime beyond Google Fonts.

## Recent changes

### Admin-settable default Convention, overrides stale cookies (2026-11-23)

**What**: Added a "Default Convention" field on `admin.html`, backed by a new
`config/settings` Firestore doc (`src/appSettings.ts`:
`getDefaultConvention`/`setDefaultConvention`). On the generator
(`src/main.ts`), the Convention field now tracks *when* it was last set via a
second cookie (`trade-cert-convention-set-at`, set alongside
`trade-cert-convention` on every `input` event). On load: if that cookie is
missing or more than 24h old, the admin-configured default (if any) is
applied instead of the stored cookie value, and the cookie pair is refreshed
to match; a convention cookie set within the last 24h is left alone.

**Why**: User wants to be able to push a new "current convention" (e.g. this
weekend's con name) from the admin screen so every generator session that
hasn't been actively used recently picks it up automatically, without wiping
out a GM's convention value mid-session just because an admin changed the
default elsewhere.

**Files touched**: `src/types.ts` (`AppSettingsDoc`), `src/appSettings.ts`
(new), `src/main.ts` (set-at cookie, staleness check before the existing
convention cookie prefill), `admin.html`/`src/admin.ts` (new panel + wiring,
reads the current default on load so the admin sees what's live).

**Verified** against the real Firebase project via Playwright: admin sets a
default convention; a generator session with no convention cookie picks it
up; a session with a convention cookie older than 24h (simulated) gets
overridden and its cookie refreshed; a session with a cookie newer than 24h
keeps its own value; a legacy convention cookie with no set-at cookie at all
(pre-dating this feature) is correctly treated as stale. All test data
(the `config/settings` doc) was deleted afterward to restore the pristine
state. One implementation wrinkle worth knowing: the Save button's click
listener must be attached *before* the `await getDefaultConvention()` call
in `admin.ts`'s `main()`, not after — otherwise a click landing in the gap
while that Firestore read is in flight does nothing (no listener yet). This
was caught by the first version of the Playwright test clicking too early.

### Player-submitted trade requests via Firebase (2026-11-23)

**What**: Added a player-facing request flow on top of Firebase Firestore,
and an admin screen, as three static pages sharing one Vite multi-page build:

- `player-form.html` / `src/playerForm.ts` — **no password gate**. A player
  fills Player, Character, 3 trade rows, Notes and clicks "Generate Request".
  This writes a `requests/{autoId}` doc to Firestore (`PlayerRequestDoc` in
  `src/types.ts`) and shows a Discord-pasteable summary + a link shaped
  `index.html#req=<docId>`, each with its own "Copy" button
  (`copyTextToClipboard` added to `src/clipboard.ts`).
- `index.html` / `src/main.ts` — on load, after the existing `ensureUnlocked('cert-gen')`
  gate and after the cookie-prefill for convention/signoff, `tryPrefillFromRequest()`
  checks `location.hash` for `#req=<id>`, strips the hash immediately (before
  the async fetch, so a reload never re-triggers it even on failure), fetches
  that Firestore doc, and fills player/character/trades/notes — the same set
  `#clear-trade` already resets. Convention/signoff are left untouched
  (still whatever cookies set). Marks the doc `status: 'claimed'` afterward
  (best-effort, failure ignored).
- `admin.html` / `src/admin.ts` — gated by a **separate** `ensureUnlocked('admin')`
  password. Lists all `requests` docs (newest first), with per-row "Open"
  (same `index.html#req=` link) and "Delete", plus "Delete All", plus a
  password-rotation form for both the cert-gen and admin password slots.

**Why these choices**:
- *Why Firestore at all*: the app is static (GitHub Pages, no server), so
  "a database" has to mean a hosted backend the browser talks to directly —
  chosen over Supabase per explicit user preference. Firebase's security
  model treats the web config as public (gating is via Security Rules, not
  secrecy), which fits this app's existing "public hash, casual deterrent"
  posture — see the Known Issues entry above for the resulting limitation.
- *Why a separate page for the player form, not a tab in `index.html`*: the
  player form must never sit behind `ensureUnlocked()`, and bolting a
  gate-skip branch onto `main()`'s startup flow seemed more tangled than a
  second small page using the same `.panel`/`.row` CSS. Same reasoning for
  `admin.html` as a third page rather than a third tab — two independent
  password overlays fighting over one `document.body` would be worse than
  one page per gate.
- *Why the link carries only an ID, not the full data*: keeps the link short
  and reuses the same `requests` collection for the admin list — no separate
  "share payload" encoding to maintain.
- *Why `PlayerRequestFields` is a new type, not `CertificateFields`*: a
  player request has no Convention/Signoff — reusing `CertificateFields`
  would mean carrying two dead fields through the whole flow.
- *Why passwords moved into Firestore (`src/passwordConfig.ts`)*: the user
  wants to rotate either password (cert-gen, admin) without a code
  change/redeploy. `ensureUnlocked()` in `src/passwordGate.ts` now takes a
  `PasswordSlot` and resolves the expected hash via
  `getPasswordHash(slot)` — Firestore's `config/passwords` doc if reachable
  and set, else a hardcoded default (the original cert-gen hash, unchanged;
  a new placeholder admin hash — default admin password is
  `change-me-admin`, **change it immediately** once Firestore is live).
  `localStorage` unlock keys are now per-slot (`trade-cert-auth-cert-gen` /
  `trade-cert-auth-admin`) so unlocking one gate doesn't unlock the other.

**Files touched**: new `src/firebaseConfig.ts` (placeholder values — see
Known Issues), `src/firebase.ts`, `src/passwordConfig.ts`, `player-form.html`,
`src/playerForm.ts`, `admin.html`, `src/admin.ts`; changed `src/types.ts`
(`PlayerRequestFields`, `PlayerRequestDoc`, `PasswordSlot`,
`PasswordConfigDoc`), `src/passwordGate.ts` (slot-aware, exports `sha256Hex`),
`src/clipboard.ts` (`copyTextToClipboard`), `src/main.ts` (gate call + prefill
flow), `vite.config.ts` (multi-page `rollupOptions.input`), `package.json`
(added `firebase` — first runtime dependency), `src/style.css` (new `.page`/
`.page.wide`/`.status`/`#requests-table` rules for the two new plain pages).

**Verified end-to-end** against the real `bmg-trading-post` Firebase project
(config now live in `src/firebaseConfig.ts`), first via direct Firestore REST
calls (create/read/list/delete on `requests`, confirmed `config/passwords`
absent so the hardcoded fallback hashes are what's actually in effect), then
via a real headless-Chromium Playwright run (`playwright` package bundled
inside the globally-installed `@playwright/mcp` server — no local
`@playwright/test` dependency, same workaround as the 2026-11-17 session):
- `npm run typecheck` / `npm run build` pass; `vite build` emits all three
  HTML entries.
- Player form: submitting a real request writes to Firestore and produces a
  correctly-shaped summary (numbered trade line, player/character) and link.
- Generator: opening the link (cert-gen gate bypassed via the documented
  `localStorage` hash trick) shows no password overlay, activates the Trade
  tab, and correctly prefills player/character/trade-0/notes from the fetched
  doc; the `#req=` hash is stripped from the URL afterward.
- Admin screen: the real password overlay appears and accepts the default
  `change-me-admin` plaintext; the requests table lists live Firestore data;
  "Delete All" and password rotation both work.
- All test data was cleaned up afterward (REST deletes of the test request
  docs, delete of the test `config/passwords` doc) — Firestore is back to its
  pristine pre-test state (`requests` empty, `config/passwords` absent, so
  both password gates still run on their hardcoded fallback hashes).

**Known timing quirk, not a bug**: after "Delete All" (or any admin mutation),
the table takes roughly 1–1.5s to visually reflect the change — `getDocs()`
in `loadRequests()` is a one-shot client-side read, not a live listener, and
there's normal Firestore SDK propagation latency between a `deleteDoc` write
and that write being visible to a subsequent `getDocs()` on the same client.
Clicking Refresh after a beat (or just waiting) always shows the correct
state; no code change was made for this since it resolves on its own and
isn't user-visibly broken, just not instant.

**Possible follow-ups**: swap the default admin password away from
`change-me-admin` as the very first admin-screen action (do this now —
testing used the real plaintext against the real project); consider whether
`status: 'claimed'` should surface anywhere in the admin UI (currently just a
column value, no filter/sort by it); consider trimming the Firebase bundle
(it's the largest asset in the build, ~155 kB gzipped) with dynamic
`import()` if load time on `player-form.html` ever matters more than it does
today; if the ~1s "Delete All" lag ever feels wrong in practice, an optimistic
UI update (clear the table immediately, don't wait on `loadRequests()`) would
fix it.

### Handwritten-style first line for signature fields (2026-11-17)

**What**: Added a global, cookie-persisted "Handwritten signature style"
checkbox (shared panel in `index.html`, next to the Logo selector). When on,
the **first rendered line** of the Trade cert's Marketplace Signoff field and
the Death Insurance cert's Signature field is drawn in "Dancing Script"
(Google Font) instead of the normal Segoe UI-ish font; any remaining wrapped
lines stay in the normal font. Off by default.

**Why these choices**:
- *Global toggle, not per-field* — user explicitly asked for a single shared
  switch rather than two independent ones, following the existing
  shared-Logo-panel pattern (`getSelectedLogo()` in `main.ts`).
- *Cookie-persisted* — consistent with how Convention/Signoff/Death-Signature
  already persist; same `getCookie`/`setCookie` pattern, new
  `handwritten-signature-style` cookie.
- *"First line" = first rendered (post-wrap) line*, not the first `\n`-delimited
  input paragraph. Since `wrapText()` already treats `\n` as a hard break and
  then word-wraps each paragraph independently, "first line" is ambiguous
  between those two readings — rendered-line was chosen because that's what's
  visually in the signature's position on the certificate.
- *Font sizing*: script fonts read visually smaller than sans-serif at the
  same pixel size, so the handwritten line is drawn at `fontSize * 1.3`
  (see `handwrittenFont()` in `src/textLayout.ts`). This is an eyeballed
  multiplier, not derived from font metrics — revisit if Dancing Script ever
  looks cramped or oversized against a given field's `maxWidth`.
- *Wrapping itself still uses the normal font's metrics* — `wrapText()`
  computes line breaks with the normal font before swapping to the
  handwritten font just for the `fillText` of line 0. This means a line that
  fits in the normal font might render visually wider/narrower once swapped
  to script — acceptable for a 1-line effect, but worth knowing if `maxWidth`
  ever gets tight.
- *Font preload*: `document.fonts.load('700 32px "Dancing Script"')` is
  awaited in `main.ts` before the first render, to avoid a fallback-font
  flash on first paint (canvas text doesn't trigger a repaint on font load
  the way DOM text does).

**Files touched**: `index.html` (font `<link>`s + checkbox markup, reusing
the existing `.checkbox-row` CSS class rather than adding a new one),
`src/textLayout.ts` (`wrapText()` gained an optional `firstLineFont` param;
added `handwrittenFont()` helper), `src/certificateCanvas.ts` and
`src/deathInsuranceCanvas.ts` (both draw functions gained a
`handwrittenFirstLine = false` param, applied only to the signoff/signature
field, not Notes), `src/main.ts` (cookie wiring, element ref, passed into
both render calls).

**Verified**: `npm run build` (tsc + vite build) passes. Visual verification
via a Playwright script against `npm run preview` (bypassing the password
gate by setting the public hash in `localStorage`, no plaintext needed)
confirmed: toggling on renders only the first line of Marketplace Signoff
and High Priest Signature in Dancing Script while later lines stay normal;
toggling off reverts both; the toggle persists across a page reload; the
Notes field is unaffected. (Note: the project has no local `@playwright/test`
dependency — the verification script imported the `playwright` package
bundled inside the globally-installed `@playwright/mcp` server instead.)

**Possible follow-ups**: a different/larger multiplier if Dancing Script
looks off at some field sizes; consider whether "Buy"/"Scribe"-style
per-field styling is ever wanted later (deliberately not built since the user
asked for one global toggle).
