// Keys are turned into a plain Command object instead of being read directly
// by game logic. From Lab 5 this exact shape is what gets serialized and sent
// to the server, so the movement code never has to change when networking
// arrives — it already consumes a Command, not a KeyboardEvent.

const keysDown = new Set()

window.addEventListener("keydown", (event) => keysDown.add(event.code))
window.addEventListener("keyup", (event) => keysDown.delete(event.code))

export function readCommand() {
  const up = keysDown.has("KeyW") || keysDown.has("ArrowUp")
  const down = keysDown.has("KeyS") || keysDown.has("ArrowDown")
  const left = keysDown.has("KeyA") || keysDown.has("ArrowLeft")
  const right = keysDown.has("KeyD") || keysDown.has("ArrowRight")

  let moveX = (right ? 1 : 0) - (left ? 1 : 0)
  let moveY = (down ? 1 : 0) - (up ? 1 : 0)

  if (moveX !== 0 && moveY !== 0) {
    const diagonal = Math.SQRT1_2
    moveX *= diagonal
    moveY *= diagonal
  }

  return { moveX, moveY, fireHook: false, aimAngle: 0 }
}
