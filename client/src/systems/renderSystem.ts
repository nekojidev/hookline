import { ARENA, RIVER } from "hookline-shared/src/constants.js"
import type { EntityManager } from "hookline-shared/src/entities/EntityManager.js"
import type { Player } from "hookline-shared/src/entities/Player.js"
import type { Tree } from "hookline-shared/src/entities/Tree.js"

export interface HookVisual {
  x: number
  y: number
}

// The client's local EntityManager only ever holds Player + Tree entities —
// hook flight isn't predicted (see PlayingState), so there's no Hook entity
// to query here. hookVisuals comes from the latest snapshot instead, keyed
// by player id rather than bolted onto the shared Player class (strict TS
// won't let you add an untyped field to a class from outside anyway).
export function renderScene(
  ctx: CanvasRenderingContext2D,
  manager: EntityManager,
  hookVisuals: Map<number, HookVisual>,
): void {
  ctx.clearRect(0, 0, ARENA.width, ARENA.height)
  drawArena(ctx)

  for (const tree of manager.query("tree")) drawTree(ctx, tree)

  const players = manager.query("player")
  for (const player of players) {
    const hookVisual = hookVisuals.get(player.id)
    if (hookVisual) drawHookVisual(ctx, player, hookVisual)
  }
  for (const player of players) drawPlayer(ctx, player)
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
  ctx.arc(
    tree.transform.x,
    tree.transform.y,
    tree.collider.radius,
    0,
    Math.PI * 2,
  )
  ctx.fill()
}

function drawHookVisual(
  ctx: CanvasRenderingContext2D,
  owner: Player,
  hookVisual: HookVisual,
): void {
  ctx.strokeStyle = "#cccccc"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(owner.transform.x, owner.transform.y)
  ctx.lineTo(hookVisual.x, hookVisual.y)
  ctx.stroke()

  ctx.fillStyle = "#e0a458"
  ctx.beginPath()
  ctx.arc(hookVisual.x, hookVisual.y, 6, 0, Math.PI * 2)
  ctx.fill()
}

// Chunky torso + head silhouette instead of a flat disc — a cheap way to
// read as "hulking Pudge-shaped butcher" with zero art assets. The head
// sits offset toward the facing angle, which doubles as the old
// facing-direction line (a head where you're looking is more legible than
// a thin stroke anyway).
function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const { x, y, angle } = player.transform
  const radius = player.collider.radius
  const alive = player.isAlive()
  const bodyColor = alive ? player.color : "#555555"

  const headRadius = radius * 0.55
  const headOffset = radius * 0.75
  const headX = x + Math.cos(angle) * headOffset
  const headY = y + Math.sin(angle) * headOffset

  ctx.globalAlpha = alive ? 1 : 0.5

  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  // Belly shading — a darker crescent low on the torso for a bit of volume.
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)"
  ctx.beginPath()
  ctx.arc(x, y + radius * 0.3, radius * 0.65, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = bodyColor
  ctx.beginPath()
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "#0d1117"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = 1

  drawHealthBar(ctx, player)
  drawLabel(ctx, player)
}

function drawHealthBar(ctx: CanvasRenderingContext2D, player: Player): void {
  const { x, y } = player.transform
  const radius = player.collider.radius
  const width = 36
  const height = 5
  const top = y - radius - 14
  const healthRatio = player.health / 100

  ctx.fillStyle = "#0d1117"
  ctx.fillRect(x - width / 2, top, width, height)

  ctx.fillStyle = healthRatio > 0.3 ? "#4caf6b" : "#c94b4b"
  ctx.fillRect(x - width / 2, top, width * healthRatio, height)
}

function drawLabel(ctx: CanvasRenderingContext2D, player: Player): void {
  const { x, y } = player.transform
  ctx.fillStyle = "#c9d1d9"
  ctx.font = "12px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(player.label, x, y - player.collider.radius - 18)
}
