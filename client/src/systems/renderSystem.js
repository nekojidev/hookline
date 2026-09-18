import { ARENA, RIVER } from "../constants.js"

export function renderScene(ctx, manager) {
  ctx.clearRect(0, 0, ARENA.width, ARENA.height)
  drawArena(ctx)

  for (const tree of manager.query("tree")) drawTree(ctx, tree)
  for (const hook of manager.query("hook")) drawHook(ctx, manager, hook)
  for (const player of manager.query("player")) drawPlayer(ctx, player)
}

function drawArena(ctx) {
  ctx.fillStyle = "#1b2733"
  ctx.fillRect(0, 0, ARENA.width, ARENA.height)

  ctx.fillStyle = "#274b6d"
  ctx.fillRect(RIVER.x, 0, RIVER.width, ARENA.height)
}

function drawTree(ctx, tree) {
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

function drawHook(ctx, manager, hook) {
  const owner = manager.get(hook.ownerId)
  if (owner) {
    ctx.strokeStyle = "#cccccc"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(owner.transform.x, owner.transform.y)
    ctx.lineTo(hook.transform.x, hook.transform.y)
    ctx.stroke()
  }

  ctx.fillStyle = "#e0a458"
  ctx.beginPath()
  ctx.arc(
    hook.transform.x,
    hook.transform.y,
    hook.collider.radius,
    0,
    Math.PI * 2,
  )
  ctx.fill()
}

function drawPlayer(ctx, player) {
  const { x, y, angle } = player.transform
  const radius = player.collider.radius

  ctx.fillStyle = player.isAlive() ? player.color : "#555555"
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = "#0d1117"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)
  ctx.stroke()

  drawHealthBar(ctx, player)
  drawLabel(ctx, player)
}

function drawHealthBar(ctx, player) {
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

function drawLabel(ctx, player) {
  const { x, y } = player.transform
  ctx.fillStyle = "#c9d1d9"
  ctx.font = "12px system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText(player.label, x, y - player.collider.radius - 18)
}
