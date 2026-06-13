# Hard Drivin' 2.0

A modern, browser- and mobile-native 3D **stunt-driving** game — loops, ramps,
crash replays and ghost time-trials — built on TypeScript, Three.js and Rapier.

> Clean-slate rebuild (June 2026). The previous engine is archived on the
> `v1.0-archive` git tag.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4200
```

You'll see the foundation smoke scene: a physics cube drops onto a ground plane
(steer it with A/D or the left stick).

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server on :4200 |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright — runs headed) |
| `npm run type-check` | `tsc --noEmit` |

## Controls

WASD / Arrows to drive · Space handbrake · R reset · Esc pause · Xbox/PS gamepad
supported. Touch controls arrive in the UI phase.

## Tech

TypeScript (strict) · Three.js · Rapier3d (WASM) · Vite · Howler · Vitest · Playwright.

## Docs

- `docs/DESIGN.md` — architecture & design pillars
- `docs/ROADMAP.md` — phased build plan
- `CLAUDE.md` — conventions, agent team, project gotchas

## License

ISC
