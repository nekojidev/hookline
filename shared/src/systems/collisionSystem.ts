// Structural typing, not a shared base class: anything with a transform and
// a collider qualifies — Player, Hook, and Tree all satisfy this without
// declaring it anywhere. That's the point of TS's type system being
// structural rather than nominal.
export interface Circular {
  transform: { x: number; y: number }
  collider: { radius: number }
}

export function circlesOverlap(a: Circular, b: Circular): boolean {
  const dx = a.transform.x - b.transform.x
  const dy = a.transform.y - b.transform.y
  return Math.hypot(dx, dy) < a.collider.radius + b.collider.radius
}
