import { describe, expect, it } from "vitest"
import { FIXED_STEP, ROT_RADIUS } from "../constants.js"
import { EntityManager } from "../entities/EntityManager.js"
import { Player } from "../entities/Player.js"
import { activateRot, updateRot } from "./rotSystem.js"

function setup(distance: number) {
  const manager = new EntityManager()
  const caster = manager.add(
    new Player(100, 100, { color: "#fff", label: "A" }),
  )
  const victim = manager.add(
    new Player(100 + distance, 100, { color: "#000", label: "B" }),
  )
  return { manager, caster, victim }
}

describe("activateRot", () => {
  it("does nothing if the player hasn't unlocked it", () => {
    const { caster } = setup(10)
    activateRot(caster)
    expect(caster.rotActiveRemaining).toBe(0)
  })

  it("activates and starts the cooldown once unlocked", () => {
    const { caster } = setup(10)
    caster.hasRot = true
    activateRot(caster)
    expect(caster.rotActiveRemaining).toBeGreaterThan(0)
    expect(caster.rotCooldownRemaining).toBeGreaterThan(0)
  })

  it("refuses while on cooldown", () => {
    const { caster } = setup(10)
    caster.hasRot = true
    activateRot(caster)
    const firstActive = caster.rotActiveRemaining
    caster.rotActiveRemaining = 0 // pretend the aura already ran out
    activateRot(caster)
    expect(caster.rotActiveRemaining).toBe(0)
    expect(firstActive).toBeGreaterThan(0)
  })
})

describe("updateRot", () => {
  it("damages an enemy within radius while active", () => {
    const { manager, caster, victim } = setup(ROT_RADIUS - 10)
    caster.hasRot = true
    activateRot(caster)

    updateRot(manager, FIXED_STEP)

    expect(victim.health).toBeLessThan(100)
  })

  it("does not damage an enemy outside the radius", () => {
    const { manager, caster, victim } = setup(ROT_RADIUS + 50)
    caster.hasRot = true
    activateRot(caster)

    updateRot(manager, FIXED_STEP)

    expect(victim.health).toBe(100)
  })

  it("does not damage the caster themself", () => {
    const { manager, caster } = setup(0)
    caster.hasRot = true
    activateRot(caster)

    updateRot(manager, FIXED_STEP)

    expect(caster.health).toBe(100)
  })

  it("expires after ROT_DURATION and stops dealing damage", () => {
    const { manager, caster, victim } = setup(ROT_RADIUS - 10)
    caster.hasRot = true
    activateRot(caster)

    for (let i = 0; i < 1000 && caster.rotActiveRemaining > 0; i++) {
      updateRot(manager, FIXED_STEP)
    }
    expect(caster.rotActiveRemaining).toBe(0)

    const healthAfterExpiry = victim.health
    updateRot(manager, FIXED_STEP)
    expect(victim.health).toBe(healthAfterExpiry)
  })
})
