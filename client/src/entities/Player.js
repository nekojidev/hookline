import { Entity } from "./Entity.js"

const MAX_HEALTH = 100
const PLAYER_RADIUS = 16

export class Player extends Entity {
  constructor(x, y, { color, label }) {
    super("player", x, y, PLAYER_RADIUS)
    this.color = color
    this.label = label
    this.health = MAX_HEALTH
    this.hookId = null
    this.hookCooldownRemaining = 0
    this.isHooked = false
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount)
  }

  isAlive() {
    return this.health > 0
  }
}
