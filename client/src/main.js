import { ARENA, FIXED_STEP, RIVER } from "./constants.js"
import { createGameLoop } from "./core/loop.js"
import { EntityManager } from "./entities/EntityManager.js"
import { Player } from "./entities/Player.js"
import { createTree } from "./entities/Tree.js"
import { createInputSource } from "./input/inputToCommand.js"
import { fireHook, updateHooks } from "./systems/hookSystem.js"
import { updatePlayerMovement } from "./systems/movementSystem.js"
import { renderScene } from "./systems/renderSystem.js"

const canvas = document.querySelector("#game")
canvas.width = ARENA.width
canvas.height = ARENA.height
const ctx = canvas.getContext("2d")

const manager = new EntityManager()

const playerOne = manager.add(
  new Player(ARENA.width / 4, ARENA.height / 2, { color: "#e0a458", label: "P1" }),
)
const playerTwo = manager.add(
  new Player((ARENA.width / 4) * 3, ARENA.height / 2, { color: "#5aa9e6", label: "P2" }),
)

const treeX = RIVER.x + RIVER.width / 2
for (const treeY of [60, 150, 270, 390, 480]) {
  manager.add(createTree(treeX, treeY))
}

const readCommandOne = createInputSource({
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  fire: "Space",
})
const readCommandTwo = createInputSource({
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  fire: "Enter",
})

function update(dt) {
  const commandOne = readCommandOne(playerOne.transform.angle)
  const commandTwo = readCommandTwo(playerTwo.transform.angle)

  if (!playerOne.isHooked) updatePlayerMovement(playerOne, commandOne, dt)
  if (!playerTwo.isHooked) updatePlayerMovement(playerTwo, commandTwo, dt)

  if (commandOne.fireHook) fireHook(manager, playerOne, commandOne.aimAngle)
  if (commandTwo.fireHook) fireHook(manager, playerTwo, commandTwo.aimAngle)

  updateHooks(manager, dt)
}

function draw() {
  renderScene(ctx, manager)
}

createGameLoop({ fixedStep: FIXED_STEP, update, render: draw }).start()
