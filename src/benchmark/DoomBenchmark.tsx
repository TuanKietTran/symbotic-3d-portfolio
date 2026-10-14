import { useCallback, useEffect, useRef, useState } from 'react'
import { Metric } from '../components/Metric'

type Preset = { name: string; scale: number; iterations: number; triangles: number }
const presets: Preset[] = [
  { name: 'Low', scale: 0.6, iterations: 18, triangles: 1 },
  { name: 'High', scale: 1, iterations: 36, triangles: 1 },
  { name: 'Burn-in', scale: 1.3, iterations: 64, triangles: 1 },
]
type Stats = { fps: number; avg: number; p95: number; frames: number; elapsed: number }
const emptyStats: Stats = { fps: 0, avg: 0, p95: 0, frames: 0, elapsed: 0 }

type BenchRenderer = { mode: 'WebGPU' | 'WebGL 2'; adapter: string; limits: string; render(time: number, iterations: number, movement: [number, number]): void; resize(scale: number): void; dispose(): void }

const wgsl = `
struct Uniforms { resolution: vec2f, time: f32, iterations: f32, movement: vec2f, pad: vec2f }
@group(0) @binding(0) var<uniform> u: Uniforms;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  var p=array<vec2f,3>(vec2f(-1.,-3.),vec2f(3.,1.),vec2f(-1.,1.)); return vec4f(p[i],0.,1.);
}
fn hash(p:vec2f)->f32 { return fract(sin(dot(p,vec2f(127.1,311.7)))*43758.5453); }
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  var uv=(frag.xy/u.resolution)*2.-1.; uv.x*=u.resolution.x/u.resolution.y;
  var col=vec3f(0.008,0.012,0.011); var glow=0.; let steps=i32(u.iterations);
  let travel=u.time*.65+u.movement.y; let strafe=u.movement.x;
  for(var i=0;i<96;i++){ if(i>=steps){break;} let z=f32(i)*.075+.2; let cell=floor(vec2f((uv.x*z+strafe)*3.,travel+1./z)); let n=hash(cell); let corridor=abs(abs(uv.x+sin(travel*.18)*.15)*z-fract(travel+n)*.12); let line=exp(-35.*corridor); glow+=line*(.012+n*.018); col+=vec3f(.06,.8,.55)*line/f32(steps); }
  let floorLine=smoothstep(.035,0.,abs(fract((uv.y+.42)*12.+travel)-.5)-.46); col+=vec3f(.05,.18,.14)*floorLine;
  let vignette=1.-.28*dot(uv,uv); col=(col+vec3f(glow))*vignette;
  return vec4f(pow(col,vec3f(.72)),1.);
}`

async function createWebGPU(canvas: HTMLCanvasElement): Promise<BenchRenderer> {
  if (!navigator.gpu) throw new Error('WebGPU unavailable')
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })
  if (!adapter) throw new Error('No WebGPU adapter')
  const device = await adapter.requestDevice()
  const context = canvas.getContext('webgpu')
  if (!context) throw new Error('No WebGPU context')
  const format = navigator.gpu.getPreferredCanvasFormat()
  context.configure({ device, format, alphaMode: 'opaque' })
  const module = device.createShaderModule({ code: wgsl })
  const compilation = await module.getCompilationInfo()
  const shaderErrors = compilation.messages.filter((message) => message.type === 'error')
  if (shaderErrors.length) {
    device.destroy()
    throw new Error(`WGSL compilation failed: ${shaderErrors.map((message) => message.message).join('; ')}`)
  }
  const pipeline = await device.createRenderPipelineAsync({ layout: 'auto', vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] }, primitive: { topology: 'triangle-list' } })
  const uniform = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
  const bind = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: uniform } }] })
  const info = adapter.info
  let currentScale = 1
  const resize = (scale: number) => { currentScale = scale; const rect = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.floor(rect.width * Math.min(devicePixelRatio, 2) * currentScale)); canvas.height = Math.max(1, Math.floor(rect.height * Math.min(devicePixelRatio, 2) * currentScale)) }
  return { mode: 'WebGPU', adapter: info.description || info.device || 'WebGPU adapter', limits: `max texture ${device.limits.maxTextureDimension2D}px · ${Math.round(device.limits.maxBufferSize / 1048576)}MB buffer`, resize, render(time, iterations, movement) { if (!canvas.width) resize(currentScale); const data = new Float32Array([canvas.width, canvas.height, time, iterations, movement[0], movement[1], 0, 0]); device.queue.writeBuffer(uniform, 0, data); const encoder = device.createCommandEncoder(); const pass = encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: .005, g: .008, b: .007, a: 1 } }] }); pass.setPipeline(pipeline); pass.setBindGroup(0, bind); pass.draw(3); pass.end(); device.queue.submit([encoder.finish()]) }, dispose() { uniform.destroy(); device.destroy() } }
}

const glslVertex = `#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`
const glslFragment = `#version 300 es
precision highp float; out vec4 outColor; uniform vec2 r; uniform float t; uniform int loops; uniform vec2 move;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 uv=gl_FragCoord.xy/r*2.-1.;uv.x*=r.x/r.y;vec3 col=vec3(.008,.012,.011);float glow=0.;float travel=t*.65+move.y;for(int i=0;i<96;i++){if(i>=loops)break;float z=float(i)*.075+.2;vec2 cell=floor(vec2((uv.x*z+move.x)*3.,travel+1./z));float n=hash(cell);float corridor=abs(abs(uv.x+sin(travel*.18)*.15)*z-fract(travel+n)*.12);float line=exp(-35.*corridor);glow+=line*(.012+n*.018);col+=vec3(.06,.8,.55)*line/float(loops);}float vig=1.-.28*dot(uv,uv);outColor=vec4(pow((col+glow)*vig,vec3(.72)),1.);}`
function createWebGL(canvas: HTMLCanvasElement): BenchRenderer {
  const gl = canvas.getContext('webgl2', { antialias: false }); if (!gl) throw new Error('WebGL 2 unavailable')
  const compile = (type: number, src: string) => { const shader = gl.createShader(type); if (!shader) throw new Error('Shader allocation failed'); gl.shaderSource(shader, src); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(shader) ?? 'Unknown shader error'; gl.deleteShader(shader); throw new Error(`GLSL compilation failed: ${log}`) } return shader }
  const vertex = compile(gl.VERTEX_SHADER, glslVertex)
  let fragment: WebGLShader
  try { fragment = compile(gl.FRAGMENT_SHADER, glslFragment) } catch (error) { gl.deleteShader(vertex); throw error }
  const program = gl.createProgram(); if (!program) { gl.deleteShader(vertex); gl.deleteShader(fragment); throw new Error('Program allocation failed') }
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program)
  gl.deleteShader(vertex); gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { const log = gl.getProgramInfoLog(program) ?? 'Unknown link error'; gl.deleteProgram(program); throw new Error(`WebGL program link failed: ${log}`) }
  const vao = gl.createVertexArray(); if (!vao) { gl.deleteProgram(program); throw new Error('Vertex array allocation failed') }; gl.bindVertexArray(vao); let currentScale = 1
  const resize = (scale: number) => { currentScale = scale; const rect = canvas.getBoundingClientRect(); canvas.width = Math.max(1, Math.floor(rect.width * Math.min(devicePixelRatio, 2) * currentScale)); canvas.height = Math.max(1, Math.floor(rect.height * Math.min(devicePixelRatio, 2) * currentScale)); gl.viewport(0, 0, canvas.width, canvas.height) }
  return { mode: 'WebGL 2', adapter: gl.getParameter(gl.RENDERER) as string, limits: `max texture ${gl.getParameter(gl.MAX_TEXTURE_SIZE) as number}px`, resize, render(time, iterations, movement) { if (!canvas.width) resize(currentScale); gl.useProgram(program); gl.uniform2f(gl.getUniformLocation(program, 'r'), canvas.width, canvas.height); gl.uniform1f(gl.getUniformLocation(program, 't'), time); gl.uniform1i(gl.getUniformLocation(program, 'loops'), iterations); gl.uniform2f(gl.getUniformLocation(program, 'move'), ...movement); gl.drawArrays(gl.TRIANGLES, 0, 3) }, dispose() { gl.deleteProgram(program); gl.deleteVertexArray(vao) } }
}

export default function DoomBenchmark() {
  const canvasRef = useRef<HTMLCanvasElement>(null); const rendererRef = useRef<BenchRenderer | null>(null); const animationRef = useRef(0); const framesRef = useRef<number[]>([]); const startedRef = useRef(0); const elapsedRef = useRef(0); const movementRef = useRef<[number,number]>([0,0]); const runningRef = useRef(false); const initializationRef = useRef(0); const presetRef = useRef(presets[1])
  const [status, setStatus] = useState<'idle'|'loading'|'running'|'paused'|'error'>('idle'); const [presetIndex, setPresetIndex] = useState(1); const [stats, setStats] = useState(emptyStats); const [device, setDevice] = useState<{ mode: string; adapter: string; limits: string } | null>(null); const [message, setMessage] = useState('Not started — GPU resources are not allocated.')
  const preset = presets[presetIndex]
  const stopLoop = useCallback(() => { runningRef.current = false; cancelAnimationFrame(animationRef.current); animationRef.current = 0 }, [])
  const loop = useCallback((now: number) => {
    if (!runningRef.current) return
    const renderer = rendererRef.current
    if (!renderer) { runningRef.current = false; return }
    const previous = framesRef.current.at(-1) ?? now
    framesRef.current.push(now); if (framesRef.current.length > 181) framesRef.current.shift()
    const elapsed = (now - startedRef.current) / 1000; elapsedRef.current = elapsed
    try { renderer.render(elapsed, presetRef.current.iterations, movementRef.current) } catch { stopLoop(); setStatus('error'); setMessage('The active GPU context was lost. Reset the benchmark to retry.'); return }
    if (framesRef.current.length > 2 && Math.floor(elapsed * 2) !== Math.floor((elapsed - (now - previous) / 1000) * 2)) { const durations = framesRef.current.slice(1).map((v, i) => v - framesRef.current[i]).sort((a,b) => a-b); const avg = durations.reduce((a,b)=>a+b,0)/durations.length; setStats({ fps: Math.round(1000/avg), avg: Number(avg.toFixed(2)), p95: Number(durations[Math.floor(durations.length*.95)].toFixed(2)), frames: Math.round(elapsed*1000/avg), elapsed: Number(elapsed.toFixed(1)) }) }
    animationRef.current = requestAnimationFrame(loop)
  }, [stopLoop])
  const beginLoop = () => { if (runningRef.current) return; runningRef.current = true; animationRef.current = requestAnimationFrame(loop) }
  const start = async () => {
    if (status === 'running' || status === 'loading') return
    if (status === 'paused' && rendererRef.current) { startedRef.current = performance.now() - elapsedRef.current * 1000; setStatus('running'); beginLoop(); return }
    const canvas = canvasRef.current; if (!canvas) return
    const initialization = ++initializationRef.current; setStatus('loading'); setMessage('Requesting a high-performance GPU adapter…')
    try {
      let renderer: BenchRenderer; try { renderer = await createWebGPU(canvas) } catch { renderer = createWebGL(canvas) }
      if (initialization !== initializationRef.current) { renderer.dispose(); return }
      rendererRef.current = renderer; renderer.resize(presetRef.current.scale); setDevice(renderer); framesRef.current = []; elapsedRef.current = 0; startedRef.current = performance.now(); setStats(emptyStats); setStatus('running'); setMessage(renderer.mode === 'WebGPU' ? 'Raw WebGPU/WGSL procedural workload — no video or game assets.' : 'WebGPU unavailable. Running the equivalent WebGL 2 shader fallback.'); beginLoop()
    } catch { if (initialization === initializationRef.current) { setStatus('error'); setMessage('Neither WebGPU nor WebGL 2 could initialize. Static benchmark details remain available.') } }
  }
  const pause = () => { elapsedRef.current = (performance.now() - startedRef.current) / 1000; stopLoop(); setStatus('paused') }
  const reset = () => { initializationRef.current++; stopLoop(); rendererRef.current?.dispose(); rendererRef.current = null; elapsedRef.current = 0; framesRef.current = []; setStatus('idle'); setStats(emptyStats); setDevice(null); movementRef.current = [0,0]; setMessage('Reset complete — GPU resources released.') }
  useEffect(() => { presetRef.current = preset; rendererRef.current?.resize(preset.scale); framesRef.current = []; if (runningRef.current) setMessage(`Workload changed live: ${preset.name} · ${preset.iterations} fragment iterations.`) }, [preset])
  useEffect(() => { const canvas = canvasRef.current; if (!canvas) return; const observer = new ResizeObserver(() => rendererRef.current?.resize(presetRef.current.scale)); observer.observe(canvas); return () => observer.disconnect() }, [])
  useEffect(() => { const down = (e: KeyboardEvent) => { if (!canvasRef.current?.matches(':focus')) return; const d = .12; if (e.key === 'w' || e.key === 'ArrowUp') movementRef.current[1] += d; if (e.key === 's' || e.key === 'ArrowDown') movementRef.current[1] -= d; if (e.key === 'a' || e.key === 'ArrowLeft') movementRef.current[0] -= d; if (e.key === 'd' || e.key === 'ArrowRight') movementRef.current[0] += d; if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) e.preventDefault() }; window.addEventListener('keydown', down); return () => window.removeEventListener('keydown', down) }, [])
  useEffect(() => () => { initializationRef.current++; stopLoop(); rendererRef.current?.dispose(); rendererRef.current = null }, [stopLoop])
  const results = JSON.stringify({ benchmark: 'Doom-inspired procedural corridor v1', renderer: device?.mode ?? 'not run', adapter: device?.adapter ?? 'unknown', preset: preset.name, workloadIterations: preset.iterations, resolutionScale: preset.scale, ...stats }, null, 2)
  const copy = async () => { await navigator.clipboard.writeText(results); setMessage('Results copied to clipboard.') }
  const download = () => { const link = document.createElement('a'); const url = URL.createObjectURL(new Blob([results], { type: 'application/json' })); link.href = url; link.download = `gpu-benchmark-${Date.now()}.json`; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 0) }
  return <div className="benchmark" data-testid="benchmark">
    <div className="benchmark-screen"><canvas ref={canvasRef} tabIndex={0} aria-label="Doom-inspired procedural GPU benchmark. Focus and use WASD or arrow keys to move."/><div className="benchmark-overlay"><span>{device?.mode ?? 'GPU STANDBY'}</span><b>{status.toUpperCase()}</b></div>{status === 'idle' && <button className="start-overlay" onClick={start}>INITIALIZE BENCHMARK</button>}</div>
    <div className="bench-controls"><div className="control-row"><button className="primary-control" onClick={status === 'running' ? pause : start} disabled={status === 'loading'}>{status === 'running' ? 'Ⅱ PAUSE' : '▶ START'}</button><button onClick={reset}>↺ RESET</button></div><fieldset><legend>Workload preset</legend><div className="button-grid">{presets.map((p,i)=><button key={p.name} className={presetIndex===i?'active':''} onClick={()=>setPresetIndex(i)}>{p.name}</button>)}</div></fieldset><p className="bench-message" role="status">{message}</p><dl className="device-list"><div><dt>Adapter</dt><dd>{device?.adapter ?? '—'}</dd></div><div><dt>Capability</dt><dd>{device?.limits ?? 'Run to inspect'}</dd></div><div><dt>Workload</dt><dd>{preset.iterations} fragment iterations · fullscreen triangle</dd></div></dl></div>
    <div className="bench-stats"><Metric label="FPS" value={String(stats.fps)}/><Metric label="Average" value={String(stats.avg)} unit=" ms"/><Metric label="P95 frame" value={String(stats.p95)} unit=" ms" tone="amber"/><Metric label="Duration" value={stats.elapsed.toFixed(1)} unit=" s"/><div className="export-actions"><button onClick={copy}>COPY RESULT</button><button onClick={download}>EXPORT JSON</button></div><small>FPS measures submitted browser frames, not GPU timestamp queries. “DOOM-inspired” describes the procedural visual language only; no Doom code, WADs, textures, or proprietary assets are used.</small></div>
  </div>
}
