import {
  ROT_COOLDOWN,
  ROT_DAMAGE_PER_SECOND,
  ROT_DURATION,
  ROT_RADIUS,
} from "../constants.js"
import type { EntityManager } from "../entities/EntityManager.js"
import type { Player } from "../entities/Player.js"

// Pudge's actual second ability: a damage aura around the caster for a few
// seconds, not another passive number. Unlocked once via the shop
// (player.hasRot), then triggered on demand like the hook — same
// fire-and-cooldown shape, different effect (AoE over time instead of a
// skillshot).
export function activateRot(player: Player): void {
  if (!player.hasRot || player.rotCooldownRemaining > 0 || !player.isAlive())
    return

  player.rotActiveRemaining = ROT_DURATION
  player.rotCooldownRemaining = ROT_COOLDOWN
}

export function updateRot(manager: EntityManager, dt: number): void {
  const players = manager.query("player")

  for (const player of players) {
    if (player.rotCooldownRemaining > 0) {
      player.rotCooldownRemaining = Math.max(
        0,
        player.rotCooldownRemaining - dt,
      )
    }
    if (player.rotActiveRemaining <= 0) continue

    player.rotActiveRemaining -= dt
    if (player.rotActiveRemaining < 0) player.rotActiveRemaining = 0
    if (!player.isAlive()) continue

    for (const other of players) {
      if (other.id === player.id || !other.isAlive()) continue

      const dx = other.transform.x - player.transform.x
      const dy = other.transform.y - player.transform.y
      if (Math.hypot(dx, dy) <= ROT_RADIUS) {
        other.takeDamage(ROT_DAMAGE_PER_SECOND * dt)
      }
    }
  }
}
