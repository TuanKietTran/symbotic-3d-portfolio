import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Metric } from './Metric'
import { SimulationEngine, formatDuration, type SimMetrics } from '../simulation/engine'

type Quality = 'eco' | 'balanced' | 'ultra'
type CameraMode = 'overview' | 'aisle' | 'follow'
type Selection = { label: string; type: string; state: string } | null
const initialMetrics: SimMetrics = { throughput: 0, active: 0, utilization: 0, uptime: 0 }

class WarehouseScene {
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(44, 1, 0.1, 180)
  private renderer: THREE.WebGLRenderer
  private frame = 0
  private last = performance.now()
  private metricClock = 0
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private selectable: THREE.Object3D[] = []
  private robots = new THREE.Group()
  private robotMeshes: THREE.Mesh[] = []
  private routes = Array.from({ length: 6 }, (_, lane) => this.createRoute(lane))
  private sim: SimulationEngine
  private cameraTarget = new THREE.Vector3()
  private drag = { active: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: false }
  private orbit = { azimuth: -0.72, elevation: 0.55, radius: 36 }
  private resizeObserver: ResizeObserver
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  constructor(private canvas: HTMLCanvasElement, private config: { speed: number; playing: boolean; quality: Quality; camera: CameraMode }, count: number, private onMetrics: (m: SimMetrics, fps: number) => void, private onSelect: (s: Selection) => void) {
    this.sim = new SimulationEngine(count)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: config.quality !== 'eco', powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.scene.background = new THREE.Color(0x07100f)
    this.scene.fog = new THREE.FogExp2(0x07100f, 0.022)
    this.camera.position.set(23, 19, 25)
    this.createWorld()
    this.applyQuality()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointerleave', this.onUp)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
    canvas.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()
    this.frame = requestAnimationFrame(this.tick)
  }

  private createWorld() {
    const hemi = new THREE.HemisphereLight(0xbdebe0, 0x121a18, 1.5)
    this.scene.add(hemi)
    const key = new THREE.DirectionalLight(0xd7fff3, 3.2)
    key.position.set(12, 24, 9); key.castShadow = true; key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = key.shadow.camera.bottom = -28; key.shadow.camera.right = key.shadow.camera.top = 28
    this.scene.add(key)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 44), new THREE.MeshStandardMaterial({ color: 0x111a18, roughness: 0.92, metalness: 0.08 }))
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'Facility floor'; this.scene.add(floor)
    const grid = new THREE.GridHelper(64, 32, 0x234b42, 0x173029); grid.position.y = 0.012; this.scene.add(grid)

    const rackGeo = new THREE.BoxGeometry(0.16, 4.8, 7.2)
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x536b65, metalness: 0.78, roughness: 0.32 })
    const rackCount = 8 * 8
    const racks = new THREE.InstancedMesh(rackGeo, rackMat, rackCount)
    const dummy = new THREE.Object3D(); let i = 0
    for (let row = 0; row < 8; row++) for (let post = 0; post < 8; post++) {
      dummy.position.set(-15 + row * 4.2, 2.4, -13 + post * 1.85); dummy.updateMatrix(); racks.setMatrixAt(i++, dummy.matrix)
    }
    racks.castShadow = true; racks.receiveShadow = true; racks.name = 'High-density rack array'; racks.userData = { kind: 'Storage', state: '92% allocated' }; this.scene.add(racks); this.selectable.push(racks)
    const beamGeo = new THREE.BoxGeometry(3.8, 0.1, 7.2)
    const beams = new THREE.InstancedMesh(beamGeo, rackMat, 8 * 4)
    i = 0
    for (let row = 0; row < 8; row++) for (let level = 0; level < 4; level++) { dummy.position.set(-12.9 + row * 4.2, 0.9 + level * 1.25, -6.5); dummy.updateMatrix(); beams.setMatrixAt(i++, dummy.matrix) }
    this.scene.add(beams)
    const toteGeo = new THREE.BoxGeometry(0.72, 0.46, 0.92)
    const toteMat = new THREE.MeshStandardMaterial({ color: 0xd0f235, roughness: 0.48 })
    const totes = new THREE.InstancedMesh(toteGeo, toteMat, 144); i = 0
    for (let row = 0; row < 8; row++) for (let level = 0; level < 3; level++) for (let z = 0; z < 6; z++) { dummy.position.set(-12.9 + row * 4.2, 1.02 + level * 1.25, -11.2 + z * 1.85); dummy.updateMatrix(); totes.setMatrixAt(i++, dummy.matrix) }
    totes.name = 'Inventory totes'; totes.userData = { kind: 'Inventory', state: 'Tracking nominal' }; this.scene.add(totes); this.selectable.push(totes)

    const beltMat = new THREE.MeshStandardMaterial({ color: 0x1e3530, metalness: 0.62, roughness: 0.42 })
    for (const z of [3.7, 7.2]) { const belt = new THREE.Mesh(new THREE.BoxGeometry(38, 0.42, 1.35), beltMat); belt.position.set(0, 0.5, z); belt.castShadow = true; belt.name = `Conveyor ${z > 5 ? 'B' : 'A'}`; belt.userData = { kind: 'Conveyor', state: 'Running · 1.8 m/s' }; this.scene.add(belt); this.selectable.push(belt) }
    const routeMat = new THREE.LineBasicMaterial({ color: 0x48e5c2, transparent: true, opacity: 0.35 })
    for (const curve of this.routes) { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)), routeMat); line.position.y = 0.05; this.scene.add(line) }
    this.scene.add(this.robots)
    this.syncRobots()
  }

  private createRoute(lane: number) { const inset = lane * 0.45; return new THREE.CatmullRomCurve3([new THREE.Vector3(-18 + inset, 0.4, 11 - inset), new THREE.Vector3(18 - inset, 0.4, 11 - inset), new THREE.Vector3(18 - inset, 0.4, -17 + inset), new THREE.Vector3(-18 + inset, 0.4, -17 + inset)], true, 'catmullrom', 0.06) }
  private syncRobots() {
    while (this.robotMeshes.length < this.sim.robots.length) {
      const entity = this.sim.robots[this.robotMeshes.length]
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.78), new THREE.MeshStandardMaterial({ color: entity.id % 3 ? 0x48e5c2 : 0xf4a261, metalness: 0.5, roughness: 0.28, emissive: 0x071a16 }))
      body.castShadow = true; body.name = entity.label; body.userData = { kind: 'Autonomous mobile robot', state: entity.status }; this.robots.add(body); this.robotMeshes.push(body); this.selectable.push(body)
    }
    while (this.robotMeshes.length > this.sim.robots.length) { const mesh = this.robotMeshes.pop()!; this.robots.remove(mesh); this.selectable = this.selectable.filter((o) => o !== mesh); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose() }
  }
  setConfig(config: Partial<typeof this.config>) { const qualityChanged = config.quality && config.quality !== this.config.quality; Object.assign(this.config, config); if (qualityChanged) this.applyQuality() }
  setCount(count: number) { this.sim.setCount(count); this.syncRobots() }
  private applyQuality() { const cap = this.config.quality === 'ultra' ? 2 : this.config.quality === 'balanced' ? 1.5 : 1; this.renderer.setPixelRatio(Math.min(devicePixelRatio, cap)); this.renderer.shadowMap.enabled = this.config.quality !== 'eco'; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; this.resize() }
  private resize() { const { clientWidth: w, clientHeight: h } = this.canvas; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix() }
  private onVisibility = () => { if (document.hidden) cancelAnimationFrame(this.frame); else { this.last = performance.now(); this.frame = requestAnimationFrame(this.tick) } }
  private onDown = (event: PointerEvent) => { this.drag = { active: true, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: false }; this.canvas.setPointerCapture(event.pointerId) }
  private onMove = (event: PointerEvent) => { if (!this.drag.active || this.config.camera !== 'overview') return; if (Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY) >= 4) this.drag.moved = true; this.orbit.azimuth -= (event.clientX - this.drag.lastX) * 0.006; this.orbit.elevation = THREE.MathUtils.clamp(this.orbit.elevation + (event.clientY - this.drag.lastY) * 0.004, 0.2, 1.15); this.drag.lastX = event.clientX; this.drag.lastY = event.clientY }
  private onUp = (event: PointerEvent) => { if (this.drag.active && !this.drag.moved) this.pick(event); this.drag.active = false }
  private onWheel = (event: WheelEvent) => { if (this.config.camera !== 'overview') return; event.preventDefault(); this.orbit.radius = THREE.MathUtils.clamp(this.orbit.radius + event.deltaY * 0.025, 18, 54) }
  private onKeyDown = (event: KeyboardEvent) => { if (this.config.camera !== 'overview') return; const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-']; if (!keys.includes(event.key)) return; event.preventDefault(); if (event.key === 'ArrowLeft') this.orbit.azimuth -= 0.08; if (event.key === 'ArrowRight') this.orbit.azimuth += 0.08; if (event.key === 'ArrowUp') this.orbit.elevation = Math.min(1.15, this.orbit.elevation + 0.05); if (event.key === 'ArrowDown') this.orbit.elevation = Math.max(0.2, this.orbit.elevation - 0.05); if (event.key === '+' || event.key === '=') this.orbit.radius = Math.max(18, this.orbit.radius - 2); if (event.key === '-') this.orbit.radius = Math.min(54, this.orbit.radius + 2) }
  private pick(event: PointerEvent) { const rect = this.canvas.getBoundingClientRect(); this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1); this.raycaster.setFromCamera(this.pointer, this.camera); const hit = this.raycaster.intersectObjects(this.selectable, false)[0]?.object; this.onSelect(hit ? { label: hit.name, type: String(hit.userData.kind ?? 'System'), state: String(hit.userData.state ?? 'Nominal') } : null) }
  private updateCamera(time: number) {
    if (this.config.camera === 'overview') { const az = this.orbit.azimuth + (this.reducedMotion ? 0 : Math.sin(time * 0.00008) * 0.06); const r = this.orbit.radius; this.camera.position.set(Math.cos(az) * r, Math.sin(this.orbit.elevation) * r, Math.sin(az) * r); this.cameraTarget.set(0, 1.2, -3) }
    else if (this.config.camera === 'aisle') { const position = new THREE.Vector3(-17, 2.2, 11); if (this.reducedMotion) this.camera.position.copy(position); else this.camera.position.lerp(position, 0.04); this.cameraTarget.set(17, 1.4, -8) }
    else { const mesh = this.robotMeshes[0]; if (mesh) { const position = mesh.position.clone().add(new THREE.Vector3(-4, 3.5, 4)); if (this.reducedMotion) { this.camera.position.copy(position); this.cameraTarget.copy(mesh.position) } else { this.camera.position.lerp(position, 0.08); this.cameraTarget.lerp(mesh.position, 0.08) } } }
    this.camera.lookAt(this.cameraTarget)
  }
  private tick = (time: number) => {
    const delta = Math.min((time - this.last) / 1000, 0.1); this.last = time
    if (this.config.playing) this.sim.update(delta, this.config.speed)
    for (let i = 0; i < this.sim.robots.length; i++) { const entity = this.sim.robots[i]; const curve = this.routes[entity.lane]; const pos = curve.getPointAt(entity.progress); const ahead = curve.getPointAt((entity.progress + 0.002) % 1); this.robotMeshes[i].position.copy(pos); this.robotMeshes[i].lookAt(ahead) }
    this.updateCamera(time); this.renderer.render(this.scene, this.camera)
    this.metricClock += delta
    if (this.metricClock > 0.5) { this.onMetrics(this.sim.metrics(), Math.round(1 / Math.max(delta, 0.001))); this.metricClock = 0 }
    this.frame = requestAnimationFrame(this.tick)
  }
  dispose() { cancelAnimationFrame(this.frame); this.resizeObserver.disconnect(); document.removeEventListener('visibilitychange', this.onVisibility); this.canvas.removeEventListener('pointerdown', this.onDown); this.canvas.removeEventListener('pointermove', this.onMove); this.canvas.removeEventListener('pointerup', this.onUp); this.canvas.removeEventListener('pointerleave', this.onUp); this.canvas.removeEventListener('wheel', this.onWheel); this.canvas.removeEventListener('keydown', this.onKeyDown); this.scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((m) => m.dispose()) } }); this.renderer.dispose() }
}

export function WarehouseTwin() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<WarehouseScene | null>(null)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [quality, setQuality] = useState<Quality>('balanced')
  const [camera, setCamera] = useState<CameraMode>('overview')
  const [robots, setRobots] = useState(12)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [fps, setFps] = useState(0)
  const [selection, setSelection] = useState<Selection>(null)
  const [error, setError] = useState(false)

  useEffect(() => { if (!canvasRef.current) return; try { sceneRef.current = new WarehouseScene(canvasRef.current, { speed: 1, playing: true, quality: 'balanced', camera: 'overview' }, 12, (m, f) => { setMetrics(m); setFps(f) }, setSelection) } catch { setError(true) } return () => sceneRef.current?.dispose() }, [])
  useEffect(() => sceneRef.current?.setConfig({ playing, speed, quality, camera }), [playing, speed, quality, camera])
  useEffect(() => sceneRef.current?.setCount(robots), [robots])

  return <section className="twin" aria-label="Interactive warehouse digital twin">
    <div className="canvas-wrap">
      {error ? <div className="static-fallback" role="status"><span>3D FALLBACK / SYSTEM MAP</span><strong>Warehouse simulation interface</strong><p>Your browser could not initialize WebGL. Controls and case-study content remain available.</p></div> : <canvas ref={canvasRef} aria-label="3D warehouse with storage racks, conveyors and moving robots. Drag to orbit, scroll to zoom, and click an object for details." tabIndex={0} data-testid="warehouse-canvas" />}
      <div className="scene-label"><span className="live-dot" /> LIVE DIGITAL TWIN <b>FACILITY // HCM-01</b></div>
      <div className="telemetry" aria-live="polite"><Metric label="Throughput" value={String(metrics.throughput)} unit=" u/h"/><Metric label="Active fleet" value={`${metrics.active}/${robots}`}/><Metric label="Utilization" value={String(metrics.utilization)} unit="%"/><Metric label="Render" value={String(fps)} unit=" fps" tone="amber"/></div>
      <div className="scene-hint">DRAG TO ORBIT · SCROLL TO ZOOM · SELECT OBJECT</div>
    </div>
    <aside className="control-deck" aria-label="Simulation controls">
      <div className="deck-head"><div><span className="eyebrow">CONTROL DECK</span><h2>Facility operations</h2></div><span className="clock">T+ {formatDuration(metrics.uptime)}</span></div>
      <div className="control-row"><button className="primary-control" onClick={() => setPlaying((v) => !v)} aria-pressed={!playing}>{playing ? 'Ⅱ  PAUSE' : '▶  RESUME'}</button><div className="segmented" aria-label="Simulation speed">{[0.5, 1, 2].map((v) => <button key={v} className={speed === v ? 'active' : ''} onClick={() => setSpeed(v)}>{v}×</button>)}</div></div>
      <label className="range-label"><span>Robot workload <output>{robots} units</output></span><input aria-label="Robot workload" type="range" min="4" max="24" value={robots} onChange={(e) => setRobots(Number(e.target.value))}/></label>
      <fieldset><legend>Camera mode</legend><div className="button-grid">{(['overview','aisle','follow'] as CameraMode[]).map((v) => <button key={v} className={camera === v ? 'active' : ''} onClick={() => setCamera(v)}>{v}</button>)}</div></fieldset>
      <fieldset><legend>Render quality</legend><div className="button-grid">{(['eco','balanced','ultra'] as Quality[]).map((v) => <button key={v} className={quality === v ? 'active' : ''} onClick={() => setQuality(v)}>{v}</button>)}</div></fieldset>
      <div className="selection" data-testid="selection-details"><span>SELECTED OBJECT</span>{selection ? <><strong>{selection.label}</strong><p>{selection.type} · {selection.state}</p></> : <><strong>None</strong><p>Select a rack, tote, conveyor, or AMR.</p></>}</div>
    </aside>
  </section>
}
