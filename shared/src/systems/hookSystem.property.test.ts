import fc from "fast-check"
import { describe, expect, it } from "vitest"
import { FIXED_STEP } from "../constants.js"
import { EntityManager } from "../entities/EntityManager.js"
import { Player } from "../entities/Player.js"
import { fireHook, updateHooks } from "./hookSystem.js"

describe("attached hook pull (property)", () => {
  it("always reels the target directly toward the owner, never sideways", () => {
    fc.assert(
      fc.property(
        fc.float({
          min: Math.fround(-200),
          max: Math.fround(200),
          noNaN: true,
        }),
        fc.float({
          min: Math.fround(-200),
          max: Math.fround(200),
          noNaN: true,
        }),
        (dx, dy) => {
          const manager = new EntityManager()
          const owner = manager.add(
            new Player(480, 270, { color: "#fff", label: "A" }),
          )
          const target = manager.add(
            new Player(480 + dx, 270 + dy, { color: "#000", label: "B" }),
          )

          // Force-attach directly instead of flying the hook there — this
          // property is about the pull step itself, not about landing the shot.
          fireHook(manager, owner, Math.atan2(dy, dx))
          const hook = manager.get(owner.hookId ?? -1)
          if (!hook || hook.type !== "hook")
            throw new Error("hook was not created")
          hook.phase = "attached"
          hook.targetId = target.id
          target.isHooked = true

          const before = { x: target.transform.x, y: target.transform.y }
          const ownerPos = { x: owner.transform.x, y: owner.transform.y }

          updateHooks(manager, FIXED_STEP)

          const movedX = target.transform.x - before.x
          const movedY = target.transform.y - before.y
          const towardX = ownerPos.x - before.x
          const towardY = ownerPos.y - before.y

          const movedLength = Math.hypot(movedX, movedY)
          const towardLength = Math.hypot(towardX, towardY)

          // Either it didn't move (already released, e.g. dx=dy=0) or it
          // moved exactly along the line to the owner — cosine of the angle
          // between "how it moved" and "the direction to the owner" is ~1.
          if (movedLength < 1e-6 || towardLength < 1e-6) return

          const cosAngle =
            (movedX * towardX + movedY * towardY) / (movedLength * towardLength)
          expect(cosAngle).toBeGreaterThan(0.999)
        },
      ),
      { numRuns: 200 },
    )
  })
})
