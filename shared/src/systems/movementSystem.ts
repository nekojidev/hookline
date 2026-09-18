import { ACCELERATION, ARENA, FRICTION, MAX_SPEED } from "../constants.js"
import type { Player } from "../entities/Player.js"
import type { InputCommand } from "../protocol.js"

export function updatePlayerMovement(
  player: Player,
  command: InputCommand,
  dt: number,
): void {
  const { transform, velocity, collider } = player
  const maxSpeed = MAX_SPEED * player.speedMultiplier
  const acceleration = ACCELERATION * player.speedMultiplier

  velocity.vx += command.moveX * acceleration * dt
  velocity.vy += command.moveY * acceleration * dt

  const damping = Math.exp(-FRICTION * dt)
  velocity.vx *= damping
  velocity.vy *= damping

  const speed = Math.hypot(velocity.vx, velocity.vy)
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
