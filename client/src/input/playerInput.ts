import type { InputCommand } from "hookline-shared/src/protocol.js"

// Movement is WASD; aim now follows the mouse cursor. The Lab 1-4 "aim =
// last movement direction" trick only existed because hotseat mode had two
// people sharing one keyboard and no way to give both of them a mouse — now
// each browser controls exactly one networked player, so a real cursor aim
// is both simpler and better.
const MOVE_KEYS = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" }
const ROT_KEY = "KeyE"

export type MoveCommand = Omit<InputCommand, "tick">
export type ReadCommand = (originX: number, originY: number) => MoveCommand

export function createPlayerInput(canvas: HTMLCanvasElement): ReadCommand {
  const keysDown = new Set<string>()
  let mouseX = canvas.width / 2
  let mouseY = canvas.height / 2
  let firePending = false
  let rotPending = false

  window.addEventListener("keydown", (event) => {
    keysDown.add(event.code)
    if (event.code === ROT_KEY) rotPending = true
  })
  window.addEventListener("keyup", (event) => keysDown.delete(event.code))

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect()
    mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width
    mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height
  })

  canvas.addEventListener("mousedown", (event) => {
    if (event.button === 0) firePending = true
  })

  return function readCommand(originX, originY) {
    const up = keysDown.has(MOVE_KEYS.up)
    const down = keysDown.has(MOVE_KEYS.down)
    const left = keysDown.has(MOVE_KEYS.left)
    const right = keysDown.has(MOVE_KEYS.right)

    let moveX = (right ? 1 : 0) - (left ? 1 : 0)
    let moveY = (down ? 1 : 0) - (up ? 1 : 0)
    if (moveX !== 0 && moveY !== 0) {
      moveX *= Math.SQRT1_2
      moveY *= Math.SQRT1_2
    }

    const aimAngle = Math.atan2(mouseY - originY, mouseX - originX)
    const fireHook = firePending
    firePending = false
    const useRot = rotPending
    rotPending = false

    return { moveX, moveY, fireHook, useRot, aimAngle }
  }
}
