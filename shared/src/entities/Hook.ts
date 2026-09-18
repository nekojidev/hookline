import { Entity } from "./Entity.js"

const HOOK_RADIUS = 6

export type HookPhase = "flying" | "attached"

export class Hook extends Entity<"hook"> {
  ownerId: number
  targetId: number | null
  phase: HookPhase
  travelled: number
  hasDamagedTarget: boolean
  // Baked in at fire time from the owner's hookRangeMultiplier (Lab 6 shop)
  // rather than read from the shared constant on every flight tick.
  maxRange: number

  constructor(
    x: number,
    y: number,
    angle: number,
    ownerId: number,
    maxRange: number,
  ) {
    super("hook", x, y, HOOK_RADIUS)
    this.transform.angle = angle
    this.ownerId = ownerId
    this.targetId = null
    this.phase = "flying"
    this.travelled = 0
    this.hasDamagedTarget = false
    this.maxRange = maxRange
  }
}
