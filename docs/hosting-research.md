# Hosting research and decision

Research date: 2026-10-13. Sources are official provider documentation; limits can change and should be rechecked before a later deployment.

## Requirements

This is a client-only Vite build. It needs HTTPS (WebGPU is restricted to secure contexts), immutable static asset delivery, SPA fallback, preview URLs, and room for optional future WASM/GLB files. It needs no Functions or database. Cross-origin isolation headers are not required by the current implementation; Pages `_headers` can add them later if a threaded WASM module requires `SharedArrayBuffer`.

## Cloudflare Pages Free

- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/): 500 builds/month, one concurrent build, 20-minute build timeout, 20,000 files/site, 25 MiB maximum per file, 100 custom domains/project, unlimited active preview deployments.
- [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/): static asset requests are free and unlimited on free and paid plans. This site does not invoke Functions.
- [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/): branch/PR deployments receive stable branch aliases and immutable hash URLs; previews are public by default and carry `X-Robots-Tag: noindex`.
- [Headers](https://developers.cloudflare.com/pages/configuration/headers/): static response headers can be set in a `public/_headers` file, up to 100 rules and 2,000 characters per header line.
- [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/): a locally verified output can be published with `npx wrangler pages deploy dist`; direct-upload projects cannot later be converted to Git integration.

The present build has no WAD, WASM, or large binary asset, so the 25 MiB single-file cap is generous. If a future open-data benchmark adds an artifact larger than 25 MiB, it should be compressed/split or hosted in R2 with an integrity hash rather than silently expanding this deployment.

## Vercel Hobby

- [Platform limits](https://vercel.com/docs/limits): 45-minute build step, 100 MB CLI source upload for Hobby, and 15,000 source files per CLI deployment.
- [Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines): Hobby includes the first 100 GB/month of Fast Data Transfer and is restricted to non-commercial personal use. A personal job portfolio fits the stated non-commercial intent as implemented (no sales, ads, payment, or affiliate links), but this restriction creates less future flexibility.
- Vercel provides Local, Preview, and Production environments and generated deployment URLs. Its React/Vite workflow is excellent, but this project does not need framework-specific server features.

## Decision

**Cloudflare Pages Free** is selected. For this static personal portfolio it provides free/unlimited static requests, adequate file/build limits, HTTPS at `pages.dev`, preview deployments, and simple security-header control. It also avoids Vercel Hobby's narrower non-commercial boundary if this portfolio later links to consulting or paid work. No paid plan, custom domain, or server runtime is required.

Deployment command after `npm run build`:

```sh
npx wrangler pages deploy dist --project-name symbotic-3d-portfolio
```

The command is only run when existing Cloudflare authentication is available. The resulting URL must be captured from Wrangler and smoke-tested; a guessed URL is never acceptable.
