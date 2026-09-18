import { Entity } from "./Entity.js"

const MAX_HEALTH = 100
const PLAYER_RADIUS = 16

export interface PlayerOptions {
  color: string
  label: string
}

export class Player extends Entity<"player"> {
  color: string
  label: string
  health: number
  hookId: number | null
  hookCooldownRemaining: number
  isHooked: boolean
  // Shop-bought multipliers (Lab 6) — plain fields defaulting to
  // no-op values instead of `?: number` + `?? 1` everywhere they're read.
  gold: number
  speedMultiplier: number
  hookRangeMultiplier: number
  regenPerSecond: number

  constructor(x: number, y: number, { color, label }: PlayerOptions) {
    super("player", x, y, PLAYER_RADIUS)
    this.color = color
    this.label = label
    this.health = MAX_HEALTH
    this.hookId = null
    this.hookCooldownRemaining = 0
    this.isHooked = false
    this.gold = 0
    this.speedMultiplier = 1
    this.hookRangeMultiplier = 1
    this.regenPerSecond = 0
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount)
  }

  isAlive(): boolean {
    return this.health > 0
  }
}
