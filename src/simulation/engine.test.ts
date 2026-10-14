import { describe, expect, it } from 'vitest'
import { SimulationEngine, formatDuration } from './engine'

describe('SimulationEngine', () => {
  it('clamps fleet size and advances deterministic routes', () => {
    const sim = new SimulationEngine(2)
    expect(sim.robots).toHaveLength(4)
    const start = sim.robots[0].progress
    sim.update(1 / 60, 1)
    expect(sim.robots[0].progress).toBeGreaterThan(start)
    sim.setCount(100)
    expect(sim.robots).toHaveLength(24)
  })
  it('formats elapsed time', () => expect(formatDuration(65.9)).toBe('01:05'))
})
