# Coinlord's Caravan Trade Certificate

A small static web app for generating two TTRPG certificate images on an
HTML canvas:

- **Trade Certificate** — convention, player/character, up to 3 trade rows,
  notes, and a Marketplace Signoff.
- **Death Insurance** — player/character/level and a High Priest Signature.

Fill in the form, the canvas preview updates live, then download or copy the
result as PNG/JPEG/WebP.

Live site: https://imaginaryfriendonline.github.io/bmg-trading-post/
(password-gated — see "Access" below).

## Stack

TypeScript + [Vite](https://vitejs.dev/), no framework, no backend.

## Getting started

```sh
npm install
npm run dev
```

Other scripts:

```sh
npm run build      # tsc type-check, then vite build (outputs to dist/)
npm run typecheck   # tsc --noEmit only
npm run preview     # serve the built dist/ locally
```

`npm run preview` serves under the `/bmg-trading-post/` base path (matching
GitHub Pages), so open `http://localhost:<port>/bmg-trading-post/`.

## Access

The page sits behind a lightweight password overlay
(`src/passwordGate.ts`) — a casual deterrent, not real security; the
password hash is public in the bundle. Ask the project owner for the shared
password.

## Deployment

Deploys to GitHub Pages via `.github/workflows/deploy.yml`, triggered by
publishing a GitHub Release (or manual workflow dispatch) — pushing to
`master` alone does not deploy. Bump the version and cut a release to ship a
change.

## For AI coding agents

See [`AGENTS.md`](./AGENTS.md) for repo layout and conventions, and
[`HANDOVER.md`](./HANDOVER.md) for recent design decisions and known issues.
