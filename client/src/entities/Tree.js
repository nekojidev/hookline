import { nextId } from "./id.js"

const TREE_RADIUS = 20

// Plain factory, not a class: a tree is nothing but a position and a
// collider, so composition beats inheritance here — no shared behavior with
// Player/Hook to justify extending Entity.
export function createTree(x, y, radius = TREE_RADIUS) {
  return {
    id: nextId(),
    type: "tree",
    transform: { x, y, angle: 0 },
    collider: { radius },
  }
}
