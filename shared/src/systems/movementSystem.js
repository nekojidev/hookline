import { ACCELERATION, ARENA, FRICTION, MAX_SPEED } from "../constants.js"

export function updatePlayerMovement(player, command, dt) {
  const { transform, velocity, collider } = player

  velocity.vx += command.moveX * ACCELERATION * dt
  velocity.vy += command.moveY * ACCELERATION * dt

  const damping = Math.exp(-FRICTION * dt)
  velocity.vx *= damping
  velocity.vy *= damping

  const speed = Math.hypot(velocity.vx, velocity.vy)
  if (speed > MAX_SPEED) {
    const scale = MAX_SPEED / speed
    velocity.vx *= scale
    velocity.vy *= scale
  }

  transform.x = clamp(
    transform.x + velocity.vx * dt,
    collider.radius,
    ARENA.width - collider.radius,
  )
  transform.y = clamp(
    transform.y + velocity.vy * dt,
    collider.radius,
    ARENA.height - collider.radius,
  )
  transform.angle = command.aimAngle
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
