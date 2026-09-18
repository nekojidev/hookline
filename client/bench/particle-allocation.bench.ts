// No Chrome DevTools in this environment to profile the render loop, so
// this is the honest substitute: Node runs the same V8 engine as Chrome,
// and perf_hooks' 'gc' entries measure real GC pause time, not a proxy for
// it. Compares the naive "push a new object into an array every burst,
// filter out the dead ones every frame" particle system against the pooled
// one actually used in src/vfx/particlePool.ts.
//
// Run with: node --expose-gc bench/particle-allocation.bench.ts
import { PerformanceObserver, performance } from "node:perf_hooks"
import { createParticlePool } from "../src/vfx/particlePool.js"

const FRAME_COUNT = 2_000_000
const DT = 1 / 60
const BURST_EVERY_N_FRAMES = 4
const BURST_SIZE = 40

interface NaiveParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

function runNaive(): void {
  let particles: NaiveParticle[] = []

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    if (frame % BURST_EVERY_N_FRAMES === 0) {
      for (let i = 0; i < BURST_SIZE; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 60 + Math.random() * 120
        particles.push({
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 0.3 + Math.random() * 0.3,
          color: "#e0a458",
        })
      }
    }

    for (const particle of particles) {
      particle.life += DT
      particle.x += particle.vx * DT
      particle.y += particle.vy * DT
      particle.vx *= 0.92
      particle.vy *= 0.92
    }

    // The allocation this benchmark is actually about: a fresh array every
    // single frame, same churn a "splice out the dead ones" approach would
    // produce — this is what particle systems look like before anyone
    // thinks about pooling.
    particles = particles.filter((particle) => particle.life < particle.maxLife)
  }
}

function runPooled(): void {
  const pool = createParticlePool(256)

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    if (frame % BURST_EVERY_N_FRAMES === 0)
      pool.spawnBurst(0, 0, BURST_SIZE, "#e0a458")
    pool.update(DT)
  }
}

async function measure(label: string, run: () => void): Promise<void> {
  const gcDurations: number[] = []
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) gcDurations.push(entry.duration)
  })
  observer.observe({ entryTypes: ["gc"] })

  const start = performance.now()
  run()
  const wallTime = performance.now() - start

  // 'gc' entries are delivered to the observer asynchronously, and run()
  // was one long synchronous call — without yielding here, we'd disconnect
  // before Node ever gets a turn to invoke the callback and every entry
  // would be lost.
  await new Promise((resolve) => setImmediate(resolve))
  await new Promise((resolve) => setImmediate(resolve))
  observer.disconnect()

  const gcTotal = gcDurations.reduce((sum, d) => sum + d, 0)
  const gcMax = gcDurations.length ? Math.max(...gcDurations) : 0

  console.log(
    `${label}\n` +
      `  wall time:    ${wallTime.toFixed(1)}ms\n` +
      `  GC pauses:    ${gcDurations.length}\n` +
      `  GC total:     ${gcTotal.toFixed(2)}ms\n` +
      `  GC max pause: ${gcMax.toFixed(2)}ms\n`,
  )
}

const gc = (globalThis as { gc?: () => void }).gc
if (typeof gc !== "function") {
  console.error(
    "Run with `node --expose-gc` (or `tsx --expose-gc`) so gc() can force a clean comparison.",
  )
  process.exit(1)
}

console.log(
  `${FRAME_COUNT} simulated frames, a burst of ${BURST_SIZE} every ${BURST_EVERY_N_FRAMES} frames\n`,
)

async function main() {
  gc?.()
  await measure(
    "naive (new array + object per burst, filter() every frame)",
    runNaive,
  )

  gc?.()
  await measure(
    "pooled (fixed-size array, zero per-frame allocation)",
    runPooled,
  )
}

main()
