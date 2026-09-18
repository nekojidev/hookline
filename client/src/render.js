import { ARENA, RIVER } from "./constants.js"

export function render(ctx, player) {
  ctx.clearRect(0, 0, ARENA.width, ARENA.height)
  drawArena(ctx)
  drawPlayer(ctx, player)
}

function drawArena(ctx) {
  ctx.fillStyle = "#1b2733"
  ctx.fillRect(0, 0, ARENA.width, ARENA.height)

  ctx.fillStyle = "#274b6d"
  ctx.fillRect(RIVER.x, 0, RIVER.width, ARENA.height)
}

function drawPlayer(ctx, player) {
  ctx.fillStyle = "#e0a458"
  ctx.beginPath()
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
  ctx.fill()
}
