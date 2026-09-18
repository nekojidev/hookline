import type { Collider, Transform } from "./Entity.js"
import { nextId } from "./id.js"

const TREE_RADIUS = 20

export interface Tree {
  id: number
  type: "tree"
  transform: Transform
  collider: Collider
}

// Plain factory, not a class: a tree is nothing but a position and a
// collider, so composition beats inheritance here — no shared behavior with
// Player/Hook to justify extending Entity.
export function createTree(
  x: number,
  y: number,
  radius: number = TREE_RADIUS,
): Tree {
  return {
    id: nextId(),
    type: "tree",
    transform: { x, y, angle: 0 },
    collider: { radius },
  }
}
