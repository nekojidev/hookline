import { ARENA, RIVER } from "hookline-shared/src/constants.js"
import type { EntityManager } from "hookline-shared/src/entities/EntityManager.js"
import type { Player } from "hookline-shared/src/entities/Player.js"
import type { Tree } from "hookline-shared/src/entities/Tree.js"

const TAU = Math.PI * 2

export interface HookVisual {
  x: number
  y: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// The client's local EntityManager only ever holds Player + Tree entities —
// hook flight isn't predicted (see PlayingState), so there's no Hook entity
// to query here. hookVisuals comes from the latest snapshot instead, keyed
// by player id rather than bolted onto the shared Player class (strict TS
// won't let you add an untyped field to a class from outside anyway).
//
// `timeSeconds` drives the walk-bob animation — real wall-clock time is
// fine for a purely cosmetic wave, no need to thread simulation time
// through just for this.
export function renderScene(
  ctx: CanvasRenderingContext2D,
  manager: EntityManager,
  hookVisuals: Map<number, HookVisual>,
  timeSeconds: number,
): void {
  ctx.clearRect(0, 0, ARENA.width, ARENA.height)
  drawArena(ctx)

  for (const tree of manager.query("tree")) drawTree(ctx, tree)

  const players = manager.query("player")
  for (const player of players) {
    if (player.rotActiveRemaining > 0) drawRotAura(ctx, player, timeSeconds)
  }
  for (const player of players) {
    const hookVisual = hookVisuals.get(player.id)
    if (hookVisual) drawHookVisual(ctx, player, hookVisual)
  }
  for (const player of players) drawPlayer(ctx, player, timeSeconds)
}

function drawArena(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = "#1b2733"
  ctx.fillRect(0, 0, ARENA.width, ARENA.height)

  ctx.fillStyle = "#274b6d"
  ctx.fillRect(RIVER.x, 0, RIVER.width, ARENA.height)
}

function drawTree(ctx: CanvasRenderingContext2D, tree: Tree): void {
  ctx.fillStyle = "#3a5f3a"
  ctx.beginPath()
  ctx.arc(tree.transform.x, tree.transform.y, tree.collider.radius, 0, TAU)
  ctx.fill()
}

// A dashed chain (segments with gaps) instead of one solid thin line, plus
// a small curved "J" at the tip instead of a plain dot — the cheapest way
// to read as an actual meat hook rather than a laser pointer.
function drawHookVisual(
  ctx: CanvasRenderingContext2D,
  owner: Player,
  hookVisual: HookVisual,
): void {
  const ox = owner.transform.x
  const oy = owner.transform.y
  const dx = hookVisual.x - ox
  const dy = hookVisual.y - oy
  const length = Math.hypot(dx, dy)
  const angle = Math.atan2(dy, dx)
  const linkLength = 12
  const segments = Math.max(1, Math.round(length / linkLength))

  ctx.strokeStyle = "#9a9a9a"
  ctx.lineWidth = 2.5
  for (let i = 0; i < segments; i += 2) {
    const t0 = i / segments
    const t1 = Math.min(1, (i + 1) / segments)
    ctx.beginPath()
    ctx.moveTo(ox + dx * t0, oy + dy * t0)
    ctx.lineTo(ox + dx * t1, oy + dy * t1)
    ctx.stroke()
  }

  ctx.save()
  ctx.translate(hookVisual.x, hookVisual.y)
  ctx.rotate(angle)
  ctx.strokeStyle = "#c9a24a"
  ctx.lineWidth = 3
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(-7, 0)
  ctx.lineTo(2, 0)
  ctx.arc(2, 3.5, 3.5, -Math.PI / 2, Math.PI * 0.55)
  ctx.stroke()
  ctx.restore()
}

// A pulsing translucent ring — Pudge's Rot aura. Pulse is driven by
// wall-clock time, not remaining duration, so it reads as "active" rather
// than counting down visually (the HUD already shows the real countdown).
function drawRotAura(
  ctx: CanvasRenderingContext2D,
  player: Player,
  timeSeconds: number,
): void {
  const { x, y } = player.transform
  const pulse = 0.5 + 0.5 * Math.sin(timeSeconds * 8)
  const radius = 70 * (0.85 + 0.15 * pulse)

  ctx.globalAlpha = 0.18 + 0.12 * pulse
  ctx.fillStyle = "#5c8a3a"
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
}

// Chunky torso + apron + head silhouette instead of a flat disc — a cheap
// way to read as "hulking Pudge-shaped butcher" with zero art assets. The
// head sits offset toward the facing angle (doubles as a facing indicator),
// clamped to the arena so it can never visually poke past the play field
// even when the body is pinned right at the edge. A slow waddle bob (scaled
// by current speed) keeps a moving player from looking like it's gliding.
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  timeSeconds: number,
): void {
  const { x, y, angle } = player.transform
  const radius = player.collider.radius
  const alive = player.isAlive()
  const bodyColor = alive ? player.color : "#555555"

  const speed = Math.hypot(player.velocity.vx, player.velocity.vy)
  const speedRatio = clamp(speed / 220, 0, 1)
  const bob = Math.sin(timeSeconds * 10) * 2 * speedRatio
  const squash = 1 - 0.06 * speedRatio * Math.abs(Math.sin(timeSeconds * 10))

  const bodyY = y + bob

  const headRadius = radius * 0.55
  const headOffset = radius * 0.75
  const headX = clamp(
    x + Math.cos(angle) * headOffset,
    headRadius,
    ARENA.width - headRadius,
  )
  const headY = clamp(
    bodyY + Math.sin(angle) * headOffset,
    headRadius,
    ARENA.height - headRadius,
  )

  ctx.globalAlpha = alive ? 1 : 0.5

  // Belly: wide squashed ellipse for a hulking gut, slightly compressed
  // vertically at the bottom of each waddle step.
  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.ellipse(x, bodyY, radius * 1.15, radius * 0.95 * squash, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = "#0d1117"
  ctx.lineWidth = 2
  ctx.stroke()

  // Apron: leather-brown trapezoid over the lower belly — the butcher's
  // signature accessory.
  ctx.fillStyle = "#6b4a2f"
  ctx.beginPath()
  ctx.moveTo(x - radius * 0.7, bodyY + radius * 0.05)
  ctx.lineTo(x + radius * 0.7, bodyY + radius * 0.05)
  ctx.lineTo(x + radius * 0.5, bodyY + radius * 0.95)
  ctx.lineTo(x - radius * 0.5, bodyY + radius * 0.95)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = "#3a2a1a"
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Head, rotated to face the aim direction so the face (eyes + hooked
  // nose) always looks toward whatever the player is aiming at.
  ctx.save()
  ctx.translate(headX, headY)
  ctx.rotate(angle)

  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.arc(0, 0, headRadius, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = "#0d1117"
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = "#0d1117"
  ctx.beginPath()
  ctx.arc(headRadius * 0.25, -headRadius * 0.35, 1.6, 0, TAU)
  ctx.arc(headRadius * 0.25, headRadius * 0.35, 1.6, 0, TAU)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(headRadius * 0.5, 0)
  ctx.lineTo(headRadius * 0.9, -headRadius * 0.15)
  ctx.lineTo(headRadius * 0.75, headRadius * 0.12)
  ctx.closePath()
  ctx.fill()

  ctx.restore()

  ctx.globalAlpha = 1

  drawHealthBar(ctx, player, bodyY)
  drawLabel(ctx, player, bodyY)
}

function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  player: Player,
  bodyY: number,
): void {
  const { x } = player.transform
  const radius = player.collider.radius
  const width = 36
  const height = 5
  const top = bodyY - radius - 14
  const healthRatio = player.health / 100

  ctx.fillStyle = "#0d1117"
  ctx.fillRect(x - width / 2, top, width, height)

  ctx.fillStyle = healthRatio > 0.3 ? "#4caf6b" : "#c94b4b"
  ctx.fillRect(x - width / 2, top, width * healthRatio, height)
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  player: Player,
  bodyY: number,
): void {
  const { x } = player.transform
  ctx.fillStyle = "#c9d1d9"
  ctx.font = "12px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(player.label, x, bodyY - player.collider.radius - 18)
}
