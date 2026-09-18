import { ARENA, FIXED_STEP, RIVER } from "../constants.js"
import { createGameLoop } from "../core/loop.js"
import { EntityManager } from "../entities/EntityManager.js"
import { Player } from "../entities/Player.js"
import { createTree } from "../entities/Tree.js"
import { createInputSource } from "../input/inputToCommand.js"
import { fireHook, updateHooks } from "../systems/hookSystem.js"
import { updatePlayerMovement } from "../systems/movementSystem.js"
import { renderScene } from "../systems/renderSystem.js"

const TREE_Y_POSITIONS = [60, 150, 270, 390, 480]

export function createPlayingState({ ctx, dom }) {
  let manager
  let loop
  let readCommandOne
  let readCommandTwo
  let playerOne
  let playerTwo

  function setupMatch() {
    manager = new EntityManager()

    playerOne = manager.add(
      new Player(ARENA.width / 4, ARENA.height / 2, {
        color: "#e0a458",
        label: "P1",
      }),
    )
    playerTwo = manager.add(
      new Player((ARENA.width / 4) * 3, ARENA.height / 2, {
        color: "#5aa9e6",
        label: "P2",
      }),
    )

    const treeX = RIVER.x + RIVER.width / 2
    for (const treeY of TREE_Y_POSITIONS) {
      manager.add(createTree(treeX, treeY))
    }

    readCommandOne = createInputSource({
      up: "KeyW",
      down: "KeyS",
      left: "KeyA",
      right: "KeyD",
      fire: "Space",
    })
    readCommandTwo = createInputSource({
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
      fire: "Enter",
    })
  }

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

  return {
    enter() {
      dom.gameScreen.hidden = false
      setupMatch()
      loop = createGameLoop({ fixedStep: FIXED_STEP, update, render: draw })
      loop.start()
    },

    exit() {
      loop?.stop()
      dom.gameScreen.hidden = true
    },
  }
}
