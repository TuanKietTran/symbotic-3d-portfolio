import { lazy, Suspense, useState } from 'react'
import { ArchitectureDiagram } from './components/ArchitectureDiagram'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SectionHeader } from './components/SectionHeader'
import { WarehouseTwin } from './components/WarehouseTwin'
import { capabilities, evidence, profile, study, tradeoffs } from './data/portfolio'

const CorridorBenchmark = lazy(() => import('./benchmark/DoomBenchmark'))

function Nav() {
  return <header className="site-nav"><a className="monogram" href="#top" aria-label="Tuan Kiet Tran home">TK<span>/</span>RT</a><nav aria-label="Primary navigation"><a href="#systems">Systems</a><a href="#evidence">Evidence</a><a href="#benchmark">GPU Lab</a><a href="#case-study">Case study</a></nav><a className="availability" href={profile.github} target="_blank" rel="noreferrer"><span/> PUBLIC WORK ↗</a></header>
}

export function App() {
  const [benchLoaded, setBenchLoaded] = useState(false)
  return <>
    <Nav />
    <main id="main">
      <section className="hero" id="top">
        <div className="hero-copy"><div className="eyebrow"><i/> REAL-TIME SYSTEMS / WEBGPU / THREE.JS</div><h1>Engineering the<br/><em>physical world</em><br/>in the browser.</h1><p>{profile.intro}</p><div className="hero-actions"><a className="cta" href="#twin">EXPLORE DIGITAL TWIN <span>↓</span></a><a href="#evidence">VIEW ENGINEERING EVIDENCE</a></div></div>
        <div className="hero-meta"><div><span>ROLE FOCUS</span><b>3D Web Engineer</b></div><div><span>LOCATION</span><b>{profile.location}</b></div><div><span>SYSTEM STATUS</span><b className="online">● Portfolio online</b></div></div>
      </section>
      <div id="twin"><ErrorBoundary><WarehouseTwin /></ErrorBoundary></div>

      <section className="section" id="systems"><SectionHeader eyebrow="01 / SYSTEMS" title="Built beyond the surface." copy="This portfolio is an executable architecture argument: separate simulation, rendering, telemetry, and interface concerns so each remains observable and replaceable."/><div className="capability-grid">{capabilities.map((item)=><article key={item.id}><span>{item.index}</span><h3>{item.title}</h3><p>{item.description}</p><ul>{item.details.map((detail)=><li key={detail}>{detail}</li>)}</ul></article>)}</div></section>

      <section className="section evidence-section" id="evidence"><SectionHeader eyebrow="02 / PUBLIC EVIDENCE" title="Systems work, in the open." copy="Claims below are limited to verifiable public repository documentation. The 3D-specific capabilities are demonstrated by this portfolio itself."/><div className="evidence-list">{evidence.map((item)=><article key={item.title}><div className="project-index">GH</div><div><h3>{item.title}</h3><p>{item.description}</p><ul className="tags">{item.tags.map((tag)=><li key={tag}>{tag}</li>)}</ul></div><a href={item.href} target="_blank" rel="noreferrer" aria-label={`${item.linkLabel}: ${item.title}`}>↗</a></article>)}</div></section>

      <section className="section benchmark-section" id="benchmark"><div className="benchmark-intro"><SectionHeader eyebrow="03 / GPU TESTBENCH" title="A workload you can measure." copy="An opt-in, procedural corridor benchmark. Raw WGSL on WebGPU with an honest WebGL 2 fallback—isolated from the initial bundle and free of proprietary game assets."/><div className="benchmark-facts"><span>TRUE GPU WORKLOAD</span><span>LAZY-LOADED</span><span>NO WAD / NO VIDEO</span></div></div>{benchLoaded ? <ErrorBoundary><Suspense fallback={<div className="module-loading">Loading GPU module…</div>}><CorridorBenchmark/></Suspense></ErrorBoundary> : <button className="load-benchmark" onClick={()=>setBenchLoaded(true)} data-testid="load-benchmark"><span>GPU MODULE / 01</span><strong>Load GPU corridor<br/>renderer benchmark</strong><i>INITIALIZE →</i><small>Original renderer; not a DOOM game. Downloads the module only on request.</small></button>}</section>

      <section className="section study-section" id="case-study"><SectionHeader eyebrow="04 / CASE STUDY" title="From command to photon." copy="The digital twin treats each frame as the end of a pipeline, not the center of the application."/><ArchitectureDiagram/><div className="study-grid">{study.map(([title,copy],i)=><article key={title}><span>{String(i+1).padStart(2,'0')}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><h3 className="tradeoff-title">Technical trade-offs</h3><div className="tradeoffs">{tradeoffs.map((item)=><article key={item.choice}><h4>{item.choice}</h4><p><b>Gain</b>{item.gain}</p><p><b>Cost</b>{item.cost}</p></article>)}</div></section>

      <section className="section process"><SectionHeader eyebrow="05 / WORKING PRACTICE" title="Reliable by construction."/><div className="process-grid"><article><span>TEST</span><h3>Automated gates</h3><p>Type checking, lint, unit coverage for deterministic simulation, and Playwright flows for the digital twin and lazy GPU lab.</p></article><article><span>PERF</span><h3>Budget before polish</h3><p>Instancing, generated assets, capped DPR, visibility pause, deferred benchmark code, resource disposal, and explicit quality tiers.</p></article><article><span>PIPE</span><h3>Blender-ready boundary</h3><p>Generated geometry keeps this demonstration lean; production GLB assets slot behind a versioned, compressed, attribution-aware loader contract.</p></article><article><span>TEAM</span><h3>Explain the system</h3><p>Typed content, documented decisions, semantic controls, architecture diagrams, and traceable public evidence make collaboration concrete.</p></article></div></section>

      <section className="contact"><span className="eyebrow">AVAILABLE FOR THE RIGHT SYSTEMS PROBLEM</span><h2>Build the interface<br/>to the <em>real world.</em></h2><p>{profile.name} · {profile.role}</p><a className="cta" href={profile.github} target="_blank" rel="noreferrer">REVIEW GITHUB <span>↗</span></a></section>
    </main>
    <footer><span>© {new Date().getFullYear()} {profile.name}</span><span>GENERATED GEOMETRY · NO PROPRIETARY ASSETS</span><a href="#top">BACK TO TOP ↑</a></footer>
  </>
}
