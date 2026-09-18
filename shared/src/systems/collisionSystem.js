export function circlesOverlap(a, b) {
  const dx = a.transform.x - b.transform.x
  const dy = a.transform.y - b.transform.y
  return Math.hypot(dx, dy) < a.collider.radius + b.collider.radius
}
