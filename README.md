# Real-time warehouse systems portfolio

A production-oriented React/TypeScript/Three.js portfolio for **Tuan Kiet Tran**, centered on an interactive warehouse digital twin and an opt-in raw WebGPU/WGSL performance lab. It uses generated geometry only and does not copy Symbotic branding or proprietary assets.

## Run

```sh
npm install
npm run dev
```

Use Node 20.19+ or 22.12+ (the local verification environment is recorded in the completion report).

## Verify

```sh
npm run lint
npm run typecheck
npm test
npx playwright install chromium   # once
npm run build
npm run test:e2e
```

Production preview: `npm run preview`.

## Architecture

- React owns semantic interface controls and low-frequency telemetry.
- `SimulationEngine` advances ECS-style robot records at a fixed timestep.
- `WarehouseScene` owns Three.js scene resources, instanced geometry, raycasting, cameras, rendering, resize, visibility, and cleanup.
- The GPU lab is a dynamic import. It runs a real procedural fragment workload in raw WebGPU/WGSL, falling back to an explicitly labeled WebGL 2 shader.
- Portfolio copy and evidence live in the typed module [`src/data/portfolio.ts`](src/data/portfolio.ts).

See [`docs/architecture.md`](docs/architecture.md) for lifecycle, performance budget, rendering/data flow, testing, and the Blender-ready asset contract. See [`docs/hosting-research.md`](docs/hosting-research.md) for the official-source Cloudflare Pages vs Vercel Hobby decision.

## Controls

- Digital twin: drag to orbit, wheel to zoom, click objects for details; use control-deck buttons for pause, speed, camera, workload, and quality.
- GPU lab: opt in with **Load**, initialize, then focus its canvas and use WASD or arrow keys. Start/pause/reset and workload presets are available without pointer lock.
- The site respects `prefers-reduced-motion` and keeps case-study content available if graphics initialization fails.

## Deploy

Cloudflare Pages Direct Upload is selected:

```sh
npm run build
npx wrangler pages deploy dist --project-name symbotic-3d-portfolio
```

Do not report deployment success until Wrangler returns a real URL and HTTP/browser smoke tests pass. No paid plan or custom domain is required.

## Evidence policy

Public-project descriptions are sourced from local checkouts of public repositories under `github.com/TuanKietTran`. No employer, degree, tenure, or unsupported production metric is asserted. 3D/WebGPU skills are presented as capabilities demonstrated by this codebase.

## License and notices

Copyright © 2026 Tuan Kiet Tran. Portfolio application code is available under the [MIT License](LICENSE).

Runtime dependencies:

- [React](https://github.com/facebook/react) — MIT
- [Three.js](https://github.com/mrdoob/three.js) — MIT
- [Vite](https://github.com/vitejs/vite) — MIT

The DOOM-inspired benchmark is original procedural shader code. It includes **no** Doom engine code, proprietary Doom WAD, Freedoom WAD, textures, sounds, models, or third-party game assets. Google Fonts are requested by CSS with system-font fallbacks; no font binaries are redistributed in this repository.
