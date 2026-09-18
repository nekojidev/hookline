// Keys are turned into a plain Command object instead of being read directly
// by game logic (see Lab 1's note on why). createInputSource() binds one
// player's keymap so two people can share a keyboard for this lab's local
// hotseat test — aim direction is just "last direction moved", since a
// hotseat pair can't both drive a mouse.

const keysDown = new Set()
const firePressed = new Set()

window.addEventListener("keydown", (event) => keysDown.add(event.code))
window.addEventListener("keyup", (event) => keysDown.delete(event.code))

export function createInputSource({ up, down, left, right, fire }) {
  window.addEventListener("keydown", (event) => {
    if (event.code === fire) firePressed.add(fire)
  })

  return function readCommand(currentAngle) {
    const isUp = keysDown.has(up)
    const isDown = keysDown.has(down)
    const isLeft = keysDown.has(left)
    const isRight = keysDown.has(right)

    let moveX = (isRight ? 1 : 0) - (isLeft ? 1 : 0)
    let moveY = (isDown ? 1 : 0) - (isUp ? 1 : 0)

    if (moveX !== 0 && moveY !== 0) {
      moveX *= Math.SQRT1_2
      moveY *= Math.SQRT1_2
    }

    const aimAngle = moveX === 0 && moveY === 0 ? currentAngle : Math.atan2(moveY, moveX)
    const fireHook = firePressed.delete(fire)

    return { moveX, moveY, fireHook, aimAngle }
  }
}
