# Architecture and performance notes

## Runtime boundaries

```text
semantic React controls
        │ commands
        ▼
SimulationEngine (fixed 60 Hz ECS-style entity records)
        │ compact positions + telemetry snapshot
        ├──────────────────► React HUD (2 Hz updates)
        ▼
WarehouseScene (Three.js ownership boundary)
        ▼
WebGLRenderer / GPU
```

React never owns per-frame object positions. `SimulationEngine` stores data-oriented robot entities and advances them at a fixed timestep. `WarehouseScene` owns all Three.js resources, input/raycasting, quality settings, resize behavior, camera motion, and disposal. The HUD receives throttled aggregate snapshots.

The GPU testbench is a separate dynamic import. On explicit initialization it requests WebGPU, compiles raw WGSL, and draws a procedural fullscreen workload. If WebGPU adapter/context creation fails, it compiles an equivalent WebGL 2 shader and labels that mode accurately. It allocates nothing before opt-in.

## Scene and asset pipeline

- Rack and tote populations are `InstancedMesh` draws.
- Routes and facility geometry are generated, so the initial project carries no model or texture payload and no asset-license ambiguity.
- A production pipeline would export Blender assets as glTF/GLB, validate axes/scale/naming in CI, use Draco or Meshopt based on measured decode cost, transcode textures to KTX2, hash filenames, and preserve source/author/license metadata beside each artifact.
- Resource lifecycle is explicit: geometries, materials, renderer, GPU buffers/device, listeners, observers, and animation frames are disposed.

## Performance budget

| Area | Budget / gate |
|---|---|
| Initial compressed JS | target < 250 KiB gzip; Three.js may be the dominant isolated chunk |
| Lazy benchmark compressed JS | target < 15 KiB gzip |
| Initial non-code assets | < 50 KiB; no remote 3D payload |
| Desktop frame target | 60 fps at balanced quality on representative hardware |
| Mobile frame target | 30+ fps with capped DPR and selectable eco mode |
| Main-thread UI work | no React state updates per rendered frame; telemetry ≤ 2 Hz |
| GPU submissions | use instancing for repeated storage/tote geometry |
| Accessibility | semantic controls, keyboard focus, reduced-motion behavior, static fallback |

These are budgets, not fabricated outcomes. Actual build sizes are recorded from `dist/`; frame telemetry is visible in the running scene and benchmark. Hardware-dependent numbers must always identify the environment.

## Reliability and testing

- Unit tests verify simulation clamping, deterministic advancement, and formatting.
- Playwright covers page loading/navigation, pause/resume and workload controls, lazy benchmark startup, reported backend, mobile layout, and a forced graphics-unavailable fallback.
- WebGPU tests run only where `navigator.gpu` and adapter creation succeed; otherwise the suite explicitly tests/records the WebGL fallback rather than claiming WebGPU execution.
- `visibilitychange` pauses the hero animation loop; `ResizeObserver` controls render size; DPR is capped per quality tier.
