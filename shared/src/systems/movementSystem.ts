import {
  ACCELERATION,
  ARENA,
  FRICTION,
  MAX_SPEED,
  RIVER,
} from "../constants.js"
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

  const nextX = clamp(
    transform.x + velocity.vx * dt,
    collider.radius,
    ARENA.width - collider.radius,
  )
  transform.x = resolveRiverCollision(transform.x, nextX, collider.radius)
  transform.y = clamp(
    transform.y + velocity.vy * dt,
    collider.radius,
    ARENA.height - collider.radius,
  )
  transform.angle = command.aimAngle
}

// The river is impassable water, not just decoration — reaching the other
// side is only possible by landing a hook on the enemy (or getting hooked
// yourself), same as real Pudge Wars. Hook flight and pull both bypass this
// function entirely (they move entities directly), so this only ever blocks
// walking. Which edge to snap to is decided by which side the player was
// already on, not which side they're moving toward, so a single fast step
// can't tunnel through the whole 80px-wide strip.
function resolveRiverCollision(
  currentX: number,
  nextX: number,
  radius: number,
): number {
  const left = RIVER.x - radius
  const right = RIVER.x + RIVER.width + radius
  if (nextX <= left || nextX >= right) return nextX
  return currentX <= left ? left : right
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
