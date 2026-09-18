import { ARENA, FIXED_STEP } from "./constants.js"
import { createGameLoop } from "./core/loop.js"
import { readCommand } from "./input/inputToCommand.js"
import { createPlayer, updatePlayer } from "./player.js"
import { render } from "./render.js"

const canvas = document.querySelector("#game")
canvas.width = ARENA.width
canvas.height = ARENA.height
const ctx = canvas.getContext("2d")

const player = createPlayer(ARENA.width / 2, ARENA.height / 2)

function update(dt) {
  const command = readCommand()
  updatePlayer(player, command, dt)
}

function draw() {
  render(ctx, player)
}

const loop = createGameLoop({ fixedStep: FIXED_STEP, update, render: draw })
loop.start()

// Lab 1 deliverable: prove the event loop is single-threaded — a synchronous
// block on the call stack freezes rAF entirely, no matter the fixed-timestep
// accumulator underneath it.
document.querySelector("#freeze-demo").addEventListener("click", () => {
  const blockUntil = performance.now() + 500
  while (performance.now() < blockUntil) {
    // intentionally blocking the call stack
  }
})
