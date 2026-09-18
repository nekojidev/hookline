import {
  ARENA,
  FIXED_STEP,
  HOOK_COOLDOWN,
  RIVER,
  TREE_Y_POSITIONS,
} from "hookline-shared/src/constants.js"
import { EntityManager } from "hookline-shared/src/entities/EntityManager.js"
import { Player } from "hookline-shared/src/entities/Player.js"
import { createTree } from "hookline-shared/src/entities/Tree.js"
import { gameEvents } from "hookline-shared/src/gameEvents.js"
import type { ServerMessage } from "hookline-shared/src/messages.js"
import {
  HOOK_PHASE,
  type HookWirePhase,
  type SnapshotSlot,
  decodeSnapshot,
  encodeInput,
} from "hookline-shared/src/protocol.js"
import { updatePlayerMovement } from "hookline-shared/src/systems/movementSystem.js"
import type { Root } from "react-dom/client"
import { createGameLoop } from "../core/loop.js"
import type { Dom } from "../dom.js"
import {
  type MoveCommand,
  type ReadCommand,
  createPlayerInput,
} from "../input/playerInput.js"
import type { Connection } from "../net/connection.js"
import { type HookVisual, renderScene } from "../systems/renderSystem.js"
import {
  type GameStateBridge,
  createGameStateBridge,
} from "../ui/gameStateBridge.js"
import { mountHud } from "../ui/mountHud.js"
import { createParticlePool } from "../vfx/particlePool.js"
import type { GameState } from "./GameStateMachine.js"

interface PendingInput extends MoveCommand {
  tick: number
}

const SPAWN = [
  { x: ARENA.width / 4, color: "#e0a458", label: "P1" },
  { x: (ARENA.width / 4) * 3, color: "#5aa9e6", label: "P2" },
] as const

// How fast the opponent's rendered position chases their latest snapshot —
// a simplified stand-in for a proper interpolation-with-render-delay
// buffer. Good enough to hide snapshot-rate jitter at 1v1 scale; a real
// interpolation buffer would be the honest next step past this lab.
const OPPONENT_SMOOTHING = 0.25
const HUD_UPDATE_EVERY_N_TICKS = 5 // ~10Hz at a 50Hz sim rate

export interface PlayingStateOptions {
  ctx: CanvasRenderingContext2D
  dom: Dom
  connection: Connection
}

export function createPlayingState({
  ctx,
  dom,
  connection,
}: PlayingStateOptions): GameState {
  // Created once for the lifetime of the app, not per-match — that's the
  // point of pooling: the same fixed set of particle slots gets reused
  // across every hook hit/miss for as long as the page lives.
  const particlePool = createParticlePool()

  let manager: EntityManager
  let loop: ReturnType<typeof createGameLoop>
  let readCommand: ReadCommand
  let mySlot: 0 | 1
  let opponentSlot: 0 | 1
  let myPlayer: Player
  let opponentPlayer: Player
  let nextInputTick: number
  let pendingInputs: PendingInput[]
  let hookVisuals: Map<number, HookVisual>
  let previousHookPhase: Map<number, HookWirePhase>
  let opponentTarget: { x: number; y: number; angle: number }
  let hookCooldownRemaining = 0
  let hudBridge: GameStateBridge
  let hudRoot: Root
  let tickCounter = 0
  let buyMessage: string | null = null

  let handleBinaryMessage: (event: Event) => void
  let handleServerMessage: (event: Event) => void

  function setupMatch(slot: 0 | 1) {
    mySlot = slot
    manager = new EntityManager()
    hookVisuals = new Map()
    previousHookPhase = new Map()
    hookCooldownRemaining = 0
    buyMessage = null

    // Explicit tuple + literal indices, not SPAWN.map(): a generic `number`
    // index (from .map()'s callback) makes noUncheckedIndexedAccess add
    // `| undefined` even though SPAWN only ever has 2 elements.
    const players: [Player, Player] = [
      manager.add(
        new Player(SPAWN[0].x, ARENA.height / 2, {
          color: SPAWN[0].color,
          label: SPAWN[0].label,
        }),
      ),
      manager.add(
        new Player(SPAWN[1].x, ARENA.height / 2, {
          color: SPAWN[1].color,
          label: SPAWN[1].label,
        }),
      ),
    ]
    opponentSlot = mySlot === 0 ? 1 : 0
    myPlayer = players[mySlot]
    opponentPlayer = players[opponentSlot]
    opponentTarget = {
      x: opponentPlayer.transform.x,
      y: opponentPlayer.transform.y,
      angle: 0,
    }

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
  function applyHookTransition(
    player: Player,
    slotData: SnapshotSlot,
    predictOwnFire: boolean,
  ) {
    const previousPhase = previousHookPhase.get(player.id) ?? HOOK_PHASE.NONE
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
      particlePool.spawnBurst(slotData.hookX, slotData.hookY, 14, "#e0a458")
    } else if (
      previousPhase === HOOK_PHASE.FLYING &&
      newPhase === HOOK_PHASE.NONE
    ) {
      gameEvents.dispatchEvent(
        new CustomEvent("hook:missed", { detail: { ownerId: player.id } }),
      )
      particlePool.spawnBurst(slotData.hookX, slotData.hookY, 6, "#8b949e")
    }

    previousHookPhase.set(player.id, newPhase)
    if (newPhase === HOOK_PHASE.NONE) hookVisuals.delete(player.id)
    else hookVisuals.set(player.id, { x: slotData.hookX, y: slotData.hookY })
  }

  function applySnapshot(snapshot: ReturnType<typeof decodeSnapshot>) {
    const mine = snapshot.slots[mySlot]
    const theirs = snapshot.slots[opponentSlot]

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
    myPlayer.gold = mine.gold
    myPlayer.isHooked = mine.isHooked
    myPlayer.velocity.vx = 0
    myPlayer.velocity.vy = 0

    while (
      pendingInputs.length &&
      pendingInputs[0]?.tick <= mine.ackInputTick
    ) {
      pendingInputs.shift()
    }
    if (!myPlayer.isHooked) {
      for (const input of pendingInputs)
        updatePlayerMovement(myPlayer, input, FIXED_STEP)
    }

    // The opponent isn't predicted at all — health/isHooked are taken
    // as-is, position/angle are smoothed toward the new target in update().
    opponentTarget = { x: theirs.x, y: theirs.y, angle: theirs.angle }
    opponentPlayer.health = theirs.health
    opponentPlayer.isHooked = theirs.isHooked

    applyHookTransition(myPlayer, mine, true)
    applyHookTransition(opponentPlayer, theirs, false)
  }

  function handleBuyResult(
    message: Extract<ServerMessage, { type: "buyResult" }>,
  ) {
    buyMessage = message.ok
      ? "Куплено!"
      : `Не вдалося: ${message.reason ?? "невідома причина"}`
  }

  function update(dt: number) {
    if (hookCooldownRemaining > 0)
      hookCooldownRemaining = Math.max(0, hookCooldownRemaining - dt)

    const command = readCommand(myPlayer.transform.x, myPlayer.transform.y)
    const input: PendingInput = { tick: nextInputTick, ...command }
    nextInputTick += 1

    if (!myPlayer.isHooked) updatePlayerMovement(myPlayer, input, dt)
    pendingInputs.push(input)
    connection.sendInput(encodeInput(input))

    if (command.fireHook && hookCooldownRemaining <= 0) {
      hookCooldownRemaining = HOOK_COOLDOWN
      gameEvents.dispatchEvent(
        new CustomEvent("hook:fired", { detail: { ownerId: myPlayer.id } }),
      )
    }

    opponentPlayer.transform.x +=
      (opponentTarget.x - opponentPlayer.transform.x) * OPPONENT_SMOOTHING
    opponentPlayer.transform.y +=
      (opponentTarget.y - opponentPlayer.transform.y) * OPPONENT_SMOOTHING
    opponentPlayer.transform.angle = opponentTarget.angle

    particlePool.update(dt)

    tickCounter += 1
    if (tickCounter % HUD_UPDATE_EVERY_N_TICKS === 0) {
      hudBridge.set({
        visible: true,
        health: myPlayer.health,
        gold: myPlayer.gold,
        hookCooldownRemaining,
        hookCooldownTotal: HOOK_COOLDOWN,
        buyMessage,
      })
    }
  }

  function draw() {
    renderScene(ctx, manager, hookVisuals)
    particlePool.draw(ctx)
  }

  return {
    enter(slotArg) {
      const slot = slotArg as 0 | 1
      dom.gameScreen.hidden = false
      setupMatch(slot)

      hudBridge = createGameStateBridge()
      hudRoot = mountHud(dom.hudRoot, hudBridge, (itemId) =>
        connection.buyItem(itemId),
      )

      handleBinaryMessage = (event) =>
        applySnapshot(
          decodeSnapshot((event as CustomEvent<ArrayBuffer>).detail),
        )
      handleServerMessage = (event) => {
        const message = (event as CustomEvent<ServerMessage>).detail
        if (message.type === "buyResult") handleBuyResult(message)
      }
      connection.events.addEventListener("binary", handleBinaryMessage)
      connection.events.addEventListener("message", handleServerMessage)

      loop = createGameLoop({ fixedStep: FIXED_STEP, update, render: draw })
      loop.start()
    },

    exit() {
      loop?.stop()
      connection.events.removeEventListener("binary", handleBinaryMessage)
      connection.events.removeEventListener("message", handleServerMessage)
      hudRoot?.unmount()
      dom.gameScreen.hidden = true
    },
  }
}
