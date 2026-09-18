import {
  ARENA,
  HOOK_COOLDOWN,
  HOOK_MAX_RANGE,
  HOOK_SPEED,
  PULL_SPEED,
  RELEASE_DISTANCE,
  TREE_DAMAGE,
} from "../constants.js"
import { Hook } from "../entities/Hook.js"
import { gameEvents } from "../gameEvents.js"
import { circlesOverlap } from "./collisionSystem.js"

export function fireHook(manager, owner, angle) {
  if (
    owner.hookId !== null ||
    owner.hookCooldownRemaining > 0 ||
    !owner.isAlive()
  )
    return

  const spawnDistance = owner.collider.radius + 8
  const hook = new Hook(
    owner.transform.x + Math.cos(angle) * spawnDistance,
    owner.transform.y + Math.sin(angle) * spawnDistance,
    angle,
    owner.id,
  )

  manager.add(hook)
  owner.hookId = hook.id
  owner.hookCooldownRemaining = HOOK_COOLDOWN
  gameEvents.dispatchEvent(
    new CustomEvent("hook:fired", { detail: { ownerId: owner.id } }),
  )
}

export function updateHooks(manager, dt) {
  for (const player of manager.query("player")) {
    if (player.hookCooldownRemaining > 0) {
      player.hookCooldownRemaining = Math.max(
        0,
        player.hookCooldownRemaining - dt,
      )
    }
  }

  for (const hook of manager.query("hook")) {
    if (hook.phase === "flying") updateFlyingHook(manager, hook, dt)
    else updateAttachedHook(manager, hook, dt)
  }
}

function updateFlyingHook(manager, hook, dt) {
  const step = HOOK_SPEED * dt
  hook.transform.x += Math.cos(hook.transform.angle) * step
  hook.transform.y += Math.sin(hook.transform.angle) * step
  hook.travelled += step

  const outOfBounds =
    hook.transform.x < 0 ||
    hook.transform.x > ARENA.width ||
    hook.transform.y < 0 ||
    hook.transform.y > ARENA.height

  if (outOfBounds || hook.travelled >= HOOK_MAX_RANGE) {
    gameEvents.dispatchEvent(
      new CustomEvent("hook:missed", { detail: { ownerId: hook.ownerId } }),
    )
    releaseHook(manager, hook)
    return
  }

  for (const player of manager.query("player")) {
    if (player.id === hook.ownerId || !player.isAlive()) continue
    if (circlesOverlap(hook, player)) {
      hook.phase = "attached"
      hook.targetId = player.id
      player.isHooked = true
      gameEvents.dispatchEvent(
        new CustomEvent("hook:attached", {
          detail: { ownerId: hook.ownerId, targetId: player.id },
        }),
      )
      return
    }
  }
}

function updateAttachedHook(manager, hook, dt) {
  const owner = manager.get(hook.ownerId)
  const target = manager.get(hook.targetId)

  if (!owner || !target) {
    releaseHook(manager, hook)
    return
  }

  const dx = owner.transform.x - target.transform.x
  const dy = owner.transform.y - target.transform.y
  const distance = Math.hypot(dx, dy)

  if (distance <= RELEASE_DISTANCE) {
    target.isHooked = false
    releaseHook(manager, hook)
    return
  }

  const step = Math.min(PULL_SPEED * dt, distance)
  target.transform.x += (dx / distance) * step
  target.transform.y += (dy / distance) * step
  target.velocity.vx = 0
  target.velocity.vy = 0

  hook.transform.x = target.transform.x
  hook.transform.y = target.transform.y

  if (!hook.hasDamagedTarget) {
    for (const tree of manager.query("tree")) {
      if (circlesOverlap(target, tree)) {
        target.takeDamage(TREE_DAMAGE)
        hook.hasDamagedTarget = true
        break
      }
    }
  }
}

function releaseHook(manager, hook) {
  const owner = manager.get(hook.ownerId)
  if (owner) owner.hookId = null
  manager.remove(hook.id)
}
