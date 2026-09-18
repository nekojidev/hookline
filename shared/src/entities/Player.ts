import { RESPAWN_DELAY } from "../constants.js"
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
  // > 0 while dead and waiting to come back — ticked down in hookSystem's
  // per-player loop, same place cooldown/regen already live.
  respawnRemaining: number
  // Where this player reappears — fixed at spawn time, not wherever they
  // happened to die.
  readonly spawnX: number
  readonly spawnY: number

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
    this.respawnRemaining = 0
    this.spawnX = x
    this.spawnY = y
  }

  takeDamage(amount: number) {
    const wasAlive = this.isAlive()
    this.health = Math.max(0, this.health - amount)
    if (wasAlive && !this.isAlive()) this.respawnRemaining = RESPAWN_DELAY
  }

  isAlive(): boolean {
    return this.health > 0
  }

  respawn(): void {
    this.health = MAX_HEALTH
    this.transform.x = this.spawnX
    this.transform.y = this.spawnY
    this.transform.angle = 0
    this.velocity.vx = 0
    this.velocity.vy = 0
    this.hookId = null
    this.hookCooldownRemaining = 0
    this.isHooked = false
    this.respawnRemaining = 0
  }
}
