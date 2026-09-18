import { describe, expect, it } from "vitest"
import { FIXED_STEP, RELEASE_DISTANCE } from "../constants.js"
import { EntityManager } from "../entities/EntityManager.js"
import { Player } from "../entities/Player.js"
import { fireHook, updateHooks } from "./hookSystem.js"

function setup() {
  const manager = new EntityManager()
  const owner = manager.add(new Player(100, 100, { color: "#fff", label: "A" }))
  const target = manager.add(
    new Player(500, 100, { color: "#000", label: "B" }),
  )
  return { manager, owner, target }
}

describe("fireHook", () => {
  it("spawns a flying hook and starts the cooldown", () => {
    const { manager, owner } = setup()
    fireHook(manager, owner, 0)

    expect(owner.hookId).not.toBeNull()
    expect(owner.hookCooldownRemaining).toBeGreaterThan(0)
  })

  it("refuses to fire again while on cooldown", () => {
    const { manager, owner } = setup()
    fireHook(manager, owner, 0)
    const firstHookId = owner.hookId

    fireHook(manager, owner, 0)

    expect(owner.hookId).toBe(firstHookId)
  })

  it("refuses to fire for a dead player", () => {
    const { manager, owner } = setup()
    owner.takeDamage(1000)

    fireHook(manager, owner, 0)

    expect(owner.hookId).toBeNull()
  })
})

describe("updateHooks", () => {
  it("attaches to a player the hook flies into and awards the owner gold", () => {
    const { manager, owner, target } = setup()
    fireHook(manager, owner, 0) // aimed straight at target, same y

    for (let i = 0; i < 200 && !target.isHooked; i++) {
      updateHooks(manager, FIXED_STEP)
    }

    expect(target.isHooked).toBe(true)
    expect(owner.gold).toBeGreaterThan(0)
  })

  it("releases once reeled in close to the owner", () => {
    const { manager, owner, target } = setup()
    fireHook(manager, owner, 0)

    for (let i = 0; i < 1000 && owner.hookId !== null; i++) {
      updateHooks(manager, FIXED_STEP)
    }

    expect(owner.hookId).toBeNull()
    expect(target.isHooked).toBe(false)
    const distance = Math.hypot(
      target.transform.x - owner.transform.x,
      target.transform.y - owner.transform.y,
    )
    expect(distance).toBeLessThanOrEqual(RELEASE_DISTANCE + 1)
  })

  it("releases on miss (max range) without ever attaching", () => {
    const { manager, owner } = setup()
    // Straight up: nothing there to hit, so it should time out on range.
    fireHook(manager, owner, -Math.PI / 2)

    for (let i = 0; i < 200 && owner.hookId !== null; i++) {
      updateHooks(manager, FIXED_STEP)
    }

    expect(owner.hookId).toBeNull()
  })
})
