// Plain factory + functions, not a class: `class`/`this`/`extends` are Lab 2's
// lesson, not Lab 1's. Movement is pure — updatePlayer(state, command, dt) is
// the same shape shared/physics.js will take over in Lab 5.

import { ARENA } from "./constants.js"

const ACCELERATION = 900 // px/s^2
const FRICTION = 6 // exponential damping per second
const MAX_SPEED = 220 // px/s
const RADIUS = 16

export function createPlayer(x, y) {
  return { x, y, vx: 0, vy: 0, radius: RADIUS }
}

export function updatePlayer(player, command, dt) {
  player.vx += command.moveX * ACCELERATION * dt
  player.vy += command.moveY * ACCELERATION * dt

  const damping = Math.exp(-FRICTION * dt)
  player.vx *= damping
  player.vy *= damping

  const speed = Math.hypot(player.vx, player.vy)
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed
    player.vx *= scale
    player.vy *= scale
  }

  player.x = clamp(
    player.x + player.vx * dt,
    player.radius,
    ARENA.width - player.radius,
  )
  player.y = clamp(
    player.y + player.vy * dt,
    player.radius,
    ARENA.height - player.radius,
  )
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
