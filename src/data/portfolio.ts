export type Evidence = { title: string; description: string; tags: string[]; href?: string; linkLabel?: string }
export type Capability = { id: string; index: string; title: string; description: string; details: string[] }

export const profile = {
  name: 'Tuan Kiet Tran',
  role: 'Real-time 3D systems engineer',
  location: 'Ho Chi Minh City · open to on-site collaboration',
  github: 'https://github.com/TuanKietTran',
  intro: 'I build observable, high-performance interfaces where spatial data, simulation state, and operators meet.',
} as const

export const capabilities: Capability[] = [
  { id: 'rendering', index: '01', title: 'Rendering systems', description: 'GPU-conscious scene architecture for dense operational environments.', details: ['Three.js + TypeScript', 'WebGPU / WGSL', 'WebGL fallback', 'Instancing + LOD'] },
  { id: 'simulation', index: '02', title: 'Simulation & state', description: 'Deterministic entity updates separated from presentation and input.', details: ['ECS-style entities', 'Fixed-step simulation', 'Telemetry snapshots', 'Lifecycle ownership'] },
  { id: 'delivery', index: '03', title: 'Production delivery', description: 'Measured performance, accessible controls, automated gates, and explicit trade-offs.', details: ['Playwright + Vitest', 'Asset budgets', 'CI-ready checks', 'Progressive enhancement'] },
]

export const evidence: Evidence[] = [
  { title: 'agent-cli-lab', description: 'A cross-platform Rust PTY host for human/agent command workflows, machine-readable transcripts, Unix sockets, and Windows named pipes.', tags: ['Rust', 'Systems', 'Cross-platform', 'CI'], href: 'https://github.com/TuanKietTran/agent-cli-lab', linkLabel: 'View public repository' },
  { title: 'gorouter', description: 'A self-hosted Go LLM router with OpenAI and Anthropic compatible endpoints, ordered fallback, cross-format streaming, usage tracking, and browser E2E coverage.', tags: ['Go', 'Streaming', 'Telemetry', 'E2E'], href: 'https://github.com/TuanKietTran/gorouter', linkLabel: 'View public repository' },
  { title: 'Odysseus macOS', description: 'A native SwiftUI client structured around protocol-driven Core services, SSE streaming, Keychain custody, localization, accessibility identifiers, and test isolation.', tags: ['SwiftUI', 'Architecture', 'Accessibility', 'Testing'], href: 'https://github.com/TuanKietTran/odysseus-macos-client', linkLabel: 'View public repository' },
]

export const study = [
  ['Problem', 'Dense automation scenes must stay legible under load while operators need immediate, trustworthy state.'],
  ['Architecture', 'React owns interface state. A scene controller owns Three.js resources. Simulation systems update compact entity records; rendering consumes snapshots.'],
  ['Rendering', 'Instanced rack/tote geometry reduces submissions. DPR and shadows follow quality tiers. Selection uses one raycast boundary.'],
  ['Data flow', 'Inputs become commands, systems advance entity state, telemetry aggregates a snapshot, and React receives throttled updates—not frame-by-frame churn.'],
  ['Reliability', 'Visibility pauses rendering, resize and disposal are explicit, unsupported graphics gets a semantic fallback, and reduced motion disables automatic camera movement.'],
  ['Next', 'Stream a real facility schema, move route solving to a Worker, and validate WebGPU render paths against production hardware.'],
] as const

export const tradeoffs = [
  { choice: 'Generated geometry', gain: 'Tiny payload, repeatable density, no licensing risk', cost: 'Less authored visual nuance than a Blender scene' },
  { choice: 'WebGL hero', gain: 'Broad dependable reach today', cost: 'WebGPU value is isolated in the opt-in benchmark' },
  { choice: 'UI outside canvas', gain: 'Native semantics, keyboard access, crisp text', cost: 'Requires a deliberate React ↔ scene command boundary' },
] as const
