const nodes = [
  ['INPUT', 'Operator commands'], ['STATE', 'React store'], ['SIM', 'ECS systems'], ['SNAP', 'Telemetry snapshot'], ['GPU', 'Three.js renderer'],
]
export function ArchitectureDiagram() {
  return <div className="architecture" role="img" aria-label="Data flows from operator commands to React state, ECS simulation systems, telemetry snapshots, and the GPU renderer">
    {nodes.map(([code, label], index) => <div className="arch-step" key={code}><span>{code}</span><strong>{label}</strong>{index < nodes.length - 1 && <i aria-hidden="true">→</i>}</div>)}
  </div>
}
