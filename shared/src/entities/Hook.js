import { Entity } from "./Entity.js"

const HOOK_RADIUS = 6

export class Hook extends Entity {
  constructor(x, y, angle, ownerId) {
    super("hook", x, y, HOOK_RADIUS)
    this.transform.angle = angle
    this.ownerId = ownerId
    this.targetId = null
    this.phase = "flying" // 'flying' | 'attached'
    this.travelled = 0
    this.hasDamagedTarget = false
  }
}
