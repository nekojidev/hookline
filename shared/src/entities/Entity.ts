import { nextId } from "./id.js"

export interface Transform {
  x: number
  y: number
  angle: number
}

export interface Velocity {
  vx: number
  vy: number
}

export interface Collider {
  radius: number
}

export type EntityType = "player" | "hook" | "tree"

// Data container, not behavior: transform/velocity/collider are the
// components every entity shares. Player and Hook add a single level of
// `extends` on top — trees stay plain factory objects, since they don't need
// any of Entity's behavior beyond the same component shapes.
//
// Generic over T so `Entity<"player">`'s `type` field is the literal
// "player", not the whole EntityType union — that's what lets
// EntityManager.query() narrow its return type from a plain string argument.
export class Entity<T extends EntityType = EntityType> {
  readonly id: number
  readonly type: T
  transform: Transform
  velocity: Velocity
  collider: Collider

  constructor(type: T, x: number, y: number, radius: number) {
    this.id = nextId()
    this.type = type
    this.transform = { x, y, angle: 0 }
    this.velocity = { vx: 0, vy: 0 }
    this.collider = { radius }
  }
}
