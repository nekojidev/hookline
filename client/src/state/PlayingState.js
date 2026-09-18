import {
  ARENA,
  FIXED_STEP,
  RIVER,
  TREE_Y_POSITIONS,
} from "hookline-shared/src/constants.js"
import { EntityManager } from "hookline-shared/src/entities/EntityManager.js"
import { Player } from "hookline-shared/src/entities/Player.js"
import { createTree } from "hookline-shared/src/entities/Tree.js"
import { gameEvents } from "hookline-shared/src/gameEvents.js"
import {
  HOOK_PHASE,
  decodeSnapshot,
  encodeInput,
} from "hookline-shared/src/protocol.js"
import { updatePlayerMovement } from "hookline-shared/src/systems/movementSystem.js"
import { createGameLoop } from "../core/loop.js"
import { createPlayerInput } from "../input/playerInput.js"
import { renderScene } from "../systems/renderSystem.js"

const SPAWN = [
  { x: ARENA.width / 4, color: "#e0a458", label: "P1" },
  { x: (ARENA.width / 4) * 3, color: "#5aa9e6", label: "P2" },
]

// How fast the opponent's rendered position chases their latest snapshot —
// a simplified stand-in for a proper interpolation-with-render-delay
// buffer. Good enough to hide snapshot-rate jitter at 1v1 scale; a real
// interpolation buffer would be the honest next step past this lab.
const OPPONENT_SMOOTHING = 0.25

export function createPlayingState({ ctx, dom, connection }) {
  let manager
  let loop
  let readCommand
  let mySlot
  let myPlayer
  let opponentPlayer
  let nextInputTick
  let pendingInputs
  let handleBinaryMessage

  function setupMatch(slot) {
    mySlot = slot
    manager = new EntityManager()

    const players = SPAWN.map((spawn) =>
      manager.add(
        new Player(spawn.x, ARENA.height / 2, {
          color: spawn.color,
          label: spawn.label,
        }),
      ),
    )
    myPlayer = players[mySlot]
    opponentPlayer = players[1 - mySlot]
    opponentPlayer.targetX = opponentPlayer.transform.x
    opponentPlayer.targetY = opponentPlayer.transform.y
    opponentPlayer.targetAngle = opponentPlayer.transform.angle

    const treeX = RIVER.x + RIVER.width / 2
    for (const treeY of TREE_Y_POSITIONS) manager.add(createTree(treeX, treeY))

    readCommand = createPlayerInput(ctx.canvas)
    // Starts at 1, not 0: the server's "nothing acknowledged yet" sentinel
    // is ackInputTick=0, so tick 0 would look pre-acknowledged the instant
    // the first snapshot arrives and get dropped before the server ever saw it.
    nextInputTick = 1
    pendingInputs = []
  }

  // Movement transitions from a state diff, not a locally-run hookSystem —
  // the client never simulates hook flight, so "did it fire/hit/miss" has
  // to be read off successive snapshots instead.
  function applyHookTransition(player, slotData, { predictOwnFire }) {
    const previousPhase = player.previousHookPhase ?? HOOK_PHASE.NONE
    const newPhase = slotData.hookPhase

    if (
      previousPhase !== HOOK_PHASE.FLYING &&
      newPhase === HOOK_PHASE.FLYING &&
      !predictOwnFire
    ) {
      gameEvents.dispatchEvent(
        new CustomEvent("hook:fired", { detail: { ownerId: player.id } }),
      )
    } else if (
      previousPhase === HOOK_PHASE.FLYING &&
      newPhase === HOOK_PHASE.ATTACHED
    ) {
      gameEvents.dispatchEvent(
        new CustomEvent("hook:attached", { detail: { ownerId: player.id } }),
      )
    } else if (
      previousPhase === HOOK_PHASE.FLYING &&
      newPhase === HOOK_PHASE.NONE
    ) {
      gameEvents.dispatchEvent(
        new CustomEvent("hook:missed", { detail: { ownerId: player.id } }),
      )
    }

    player.previousHookPhase = newPhase
    player.hookVisual =
      newPhase === HOOK_PHASE.NONE
        ? null
        : {
            phase: newPhase === HOOK_PHASE.ATTACHED ? "attached" : "flying",
            x: slotData.hookX,
            y: slotData.hookY,
          }
  }

  function applySnapshot(snapshot) {
    const mine = snapshot.slots[mySlot]
    const theirs = snapshot.slots[1 - mySlot]

    // Reconciliation: snap to the server's confirmed state, drop every
    // input it already accounted for, then replay whatever's left so the
    // predicted position picks up from the authoritative baseline instead
    // of jumping backwards. Velocity isn't sent over the wire, so replay
    // rebuilds it from zero — converges within a tick or two since friction
    // damps hard, and snapshots arrive every ~20ms anyway.
    myPlayer.transform.x = mine.x
    myPlayer.transform.y = mine.y
    myPlayer.transform.angle = mine.angle
    myPlayer.health = mine.health
    myPlayer.isHooked = mine.isHooked
    myPlayer.velocity.vx = 0
    myPlayer.velocity.vy = 0

    while (pendingInputs.length && pendingInputs[0].tick <= mine.ackInputTick) {
      pendingInputs.shift()
    }
    if (!myPlayer.isHooked) {
      for (const input of pendingInputs)
        updatePlayerMovement(myPlayer, input, FIXED_STEP)
    }

    // The opponent isn't predicted at all — health/isHooked are taken
    // as-is, position/angle are smoothed toward the new target in update().
    opponentPlayer.targetX = theirs.x
    opponentPlayer.targetY = theirs.y
    opponentPlayer.targetAngle = theirs.angle
    opponentPlayer.health = theirs.health
    opponentPlayer.isHooked = theirs.isHooked

    applyHookTransition(myPlayer, mine, { predictOwnFire: true })
    applyHookTransition(opponentPlayer, theirs, { predictOwnFire: false })
  }

  function update(dt) {
    const command = readCommand(myPlayer.transform.x, myPlayer.transform.y)
    const input = { tick: nextInputTick, ...command }
    nextInputTick += 1

    if (!myPlayer.isHooked) updatePlayerMovement(myPlayer, input, dt)
    pendingInputs.push(input)
    connection.sendInput(encodeInput(input))

    if (command.fireHook) {
      gameEvents.dispatchEvent(
        new CustomEvent("hook:fired", { detail: { ownerId: myPlayer.id } }),
      )
    }

    opponentPlayer.transform.x +=
      (opponentPlayer.targetX - opponentPlayer.transform.x) * OPPONENT_SMOOTHING
    opponentPlayer.transform.y +=
      (opponentPlayer.targetY - opponentPlayer.transform.y) * OPPONENT_SMOOTHING
    opponentPlayer.transform.angle = opponentPlayer.targetAngle
  }

  function draw() {
    renderScene(ctx, manager)
  }

  return {
    enter(slot) {
      dom.gameScreen.hidden = false
      setupMatch(slot)

      handleBinaryMessage = (event) =>
        applySnapshot(decodeSnapshot(event.detail))
      connection.events.addEventListener("binary", handleBinaryMessage)

      loop = createGameLoop({ fixedStep: FIXED_STEP, update, render: draw })
      loop.start()
    },

    exit() {
      loop?.stop()
      connection.events.removeEventListener("binary", handleBinaryMessage)
      dom.gameScreen.hidden = true
    },
  }
}
