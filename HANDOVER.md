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

## Recent changes

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
