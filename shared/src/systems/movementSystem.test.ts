import { describe, expect, it } from "vitest"
import { ARENA, MAX_SPEED } from "../constants.js"
import { Player } from "../entities/Player.js"
import { updatePlayerMovement } from "./movementSystem.js"

function createTestPlayer() {
  return new Player(ARENA.width / 2, ARENA.height / 2, {
    color: "#fff",
    label: "T",
  })
}

describe("updatePlayerMovement", () => {
  it("accelerates in the input direction", () => {
    const player = createTestPlayer()
    updatePlayerMovement(
      player,
      {
        tick: 1,
        moveX: 1,
        moveY: 0,
        fireHook: false,
        useRot: false,
        aimAngle: 0,
      },
      0.1,
    )

    expect(player.velocity.vx).toBeGreaterThan(0)
    expect(player.velocity.vy).toBe(0)
  })

  it("decays velocity via friction once input stops", () => {
    const player = createTestPlayer()
    updatePlayerMovement(
      player,
      {
        tick: 1,
        moveX: 1,
        moveY: 0,
        fireHook: false,
        useRot: false,
        aimAngle: 0,
      },
      0.1,
    )
    const speedAfterAccel = player.velocity.vx

    updatePlayerMovement(
      player,
      {
        tick: 1,
        moveX: 0,
        moveY: 0,
        fireHook: false,
        useRot: false,
        aimAngle: 0,
      },
      0.1,
    )

    expect(player.velocity.vx).toBeLessThan(speedAfterAccel)
    expect(player.velocity.vx).toBeGreaterThan(0)
  })

  it("never exceeds MAX_SPEED even after sustained full input", () => {
    const player = createTestPlayer()
    for (let i = 0; i < 200; i++) {
      updatePlayerMovement(
        player,
        {
          tick: 1,
          moveX: 1,
          moveY: 0,
          fireHook: false,
          useRot: false,
          aimAngle: 0,
        },
        1 / 50,
      )
    }

    const speed = Math.hypot(player.velocity.vx, player.velocity.vy)
    expect(speed).toBeLessThanOrEqual(MAX_SPEED + 1e-6)
  })

  it("clamps position to the arena bounds", () => {
    const player = createTestPlayer()
    player.transform.x = 5
    player.transform.y = 5

    updatePlayerMovement(
      player,
      {
        tick: 1,
        moveX: -1,
        moveY: -1,
        fireHook: false,
        useRot: false,
        aimAngle: 0,
      },
      1,
    )

    expect(player.transform.x).toBeGreaterThanOrEqual(player.collider.radius)
    expect(player.transform.y).toBeGreaterThanOrEqual(player.collider.radius)
  })

  it("scales both acceleration and top speed by speedMultiplier (shop boots)", () => {
    const baseline = createTestPlayer()
    const boosted = createTestPlayer()
    boosted.speedMultiplier = 1.15

    for (let i = 0; i < 30; i++) {
      updatePlayerMovement(
        baseline,
        {
          tick: 1,
          moveX: 1,
          moveY: 0,
          fireHook: false,
          useRot: false,
          aimAngle: 0,
        },
        1 / 50,
      )
      updatePlayerMovement(
        boosted,
        {
          tick: 1,
          moveX: 1,
          moveY: 0,
          fireHook: false,
          useRot: false,
          aimAngle: 0,
        },
        1 / 50,
      )
    }

    expect(boosted.velocity.vx).toBeGreaterThan(baseline.velocity.vx)
  })
})
