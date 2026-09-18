export interface Particle {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

const DEFAULT_POOL_SIZE = 128
const DRAG = 0.92
const RADIUS = 2.5

// Fixed-size array of pre-allocated particles, reused forever — this is the
// object pool. The alternative (push a new {x,y,vx,vy,...} object into an
// array on every hook hit, splice it out when it dies) allocates and frees
// small objects every frame under load, which is exactly the kind of
// garbage V8's minor GC has to sweep — see bench/particle-allocation.bench.ts
// for the measured difference.
export function createParticlePool(size: number = DEFAULT_POOL_SIZE) {
  const particles: Particle[] = Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0,
    color: "#ffffff",
  }))

  function spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
  ): void {
    let spawned = 0
    for (const particle of particles) {
      if (spawned >= count) return
      if (particle.active) continue

      const angle = Math.random() * Math.PI * 2
      const speed = 60 + Math.random() * 120

      particle.active = true
      particle.x = x
      particle.y = y
      particle.vx = Math.cos(angle) * speed
      particle.vy = Math.sin(angle) * speed
      particle.life = 0
      particle.maxLife = 0.3 + Math.random() * 0.3
      particle.color = color
      spawned += 1
    }
    // If the pool is exhausted, the burst is just smaller than asked —
    // no allocation, no growing the array, no silent memory growth under
    // sustained fire.
  }

  function update(dt: number): void {
    for (const particle of particles) {
      if (!particle.active) continue

      particle.life += dt
      if (particle.life >= particle.maxLife) {
        particle.active = false
        continue
      }

      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      particle.vx *= DRAG
      particle.vy *= DRAG
    }
  }

  function draw(ctx: CanvasRenderingContext2D): void {
    for (const particle of particles) {
      if (!particle.active) continue

      ctx.globalAlpha = Math.max(0, 1 - particle.life / particle.maxLife)
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, RADIUS, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  return { spawnBurst, update, draw }
}

export type ParticlePool = ReturnType<typeof createParticlePool>
