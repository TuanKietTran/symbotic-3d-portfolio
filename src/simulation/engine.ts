export type RobotEntity = { id: number; label: string; lane: number; progress: number; speed: number; status: 'routing' | 'charging' | 'loading' }
export type SimMetrics = { throughput: number; active: number; utilization: number; uptime: number }

export class SimulationEngine {
  robots: RobotEntity[] = []
  elapsed = 0
  private accumulator = 0
  private readonly step = 1 / 60

  constructor(count = 12) { this.setCount(count) }

  setCount(count: number) {
    const target = Math.max(4, Math.min(24, count))
    while (this.robots.length < target) {
      const id = this.robots.length
      this.robots.push({ id, label: `AMR-${String(id + 1).padStart(2, '0')}`, lane: id % 6, progress: (id * 0.083) % 1, speed: 0.7 + (id % 4) * 0.12, status: id % 7 === 0 ? 'loading' : 'routing' })
    }
    this.robots.length = target
  }

  update(delta: number, speed: number) {
    this.accumulator += Math.min(delta, 0.1) * speed
    while (this.accumulator >= this.step) {
      this.elapsed += this.step
      for (const robot of this.robots) robot.progress = (robot.progress + this.step * robot.speed * 0.045) % 1
      this.accumulator -= this.step
    }
  }

  metrics(): SimMetrics {
    const active = this.robots.filter((r) => r.status !== 'charging').length
    return { throughput: Math.round(active * 112 + Math.sin(this.elapsed * 0.5) * 24), active, utilization: Math.round((active / this.robots.length) * 94), uptime: this.elapsed }
  }
}

export function formatDuration(seconds: number) {
  const total = Math.floor(seconds)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
