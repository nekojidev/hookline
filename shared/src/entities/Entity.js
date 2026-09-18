import { nextId } from "./id.js"

// Data container, not behavior: transform/velocity/collider are the
// components every entity shares. Player and Hook add a single level of
// `extends` on top — trees stay plain factory objects, since they don't need
// any of Entity's behavior beyond the same component shapes.
export class Entity {
  constructor(type, x, y, radius) {
    this.id = nextId()
    this.type = type
    this.transform = { x, y, angle: 0 }
    this.velocity = { vx: 0, vy: 0 }
    this.collider = { radius }
  }
}
