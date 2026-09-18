import {
  ARENA,
  FIXED_STEP,
  RIVER,
  TREE_Y_POSITIONS,
} from "hookline-shared/src/constants.js"
import { EntityManager } from "hookline-shared/src/entities/EntityManager.js"
import { Player } from "hookline-shared/src/entities/Player.js"
import { createTree } from "hookline-shared/src/entities/Tree.js"
import { HOOK_PHASE, encodeSnapshot } from "hookline-shared/src/protocol.js"
import {
  fireHook,
  updateHooks,
} from "hookline-shared/src/systems/hookSystem.js"
import { updatePlayerMovement } from "hookline-shared/src/systems/movementSystem.js"

const SPAWN = [
  { x: ARENA.width / 4, color: "#e0a458", label: "P1" },
  { x: (ARENA.width / 4) * 3, color: "#5aa9e6", label: "P2" },
]

// The one authoritative copy of the simulation for a single 1v1 match. Both
// client prediction and this loop call the exact same shared/systems
// functions — that's the whole point of the shared/ workspace: the physics
// isn't reimplemented per-runtime, so client and server can't disagree on
// what a given input does.
export class Match {
  #manager = new EntityManager()
  #slots
  #serverTick = 0
  #intervalHandle = null

  constructor(clients) {
    this.#slots = clients.map(({ ws }, netId) => {
      const spawn = SPAWN[netId]
      const player = this.#manager.add(
        new Player(spawn.x, ARENA.height / 2, {
          color: spawn.color,
          label: spawn.label,
        }),
      )
      return { ws, player, inputQueue: [], lastProcessedInputTick: 0 }
    })

    const treeX = RIVER.x + RIVER.width / 2
    for (const treeY of TREE_Y_POSITIONS) {
      this.#manager.add(createTree(treeX, treeY))
    }
  }

  queueInput(netId, input) {
    this.#slots[netId]?.inputQueue.push(input)
  }

  start() {
    this.#intervalHandle = setInterval(() => this.#tick(), FIXED_STEP * 1000)
  }

  stop() {
    clearInterval(this.#intervalHandle)
  }

  #tick() {
    for (const slot of this.#slots) {
      const batch = slot.inputQueue
      slot.inputQueue = []
      if (batch.length === 0) continue

      const shouldFire = batch.some((input) => input.fireHook)
      const latest = batch[batch.length - 1]

      if (!slot.player.isHooked)
        updatePlayerMovement(slot.player, latest, FIXED_STEP)
      if (shouldFire) fireHook(this.#manager, slot.player, latest.aimAngle)

      slot.lastProcessedInputTick = latest.tick
    }

    updateHooks(this.#manager, FIXED_STEP)

    this.#serverTick += 1
    this.#broadcastSnapshot()
  }

  #broadcastSnapshot() {
    const snapshot = {
      serverTick: this.#serverTick,
      slots: this.#slots.map((slot) => {
        const hook = this.#hookInfo(slot.player)
        return {
          connected: 1,
          ackInputTick: slot.lastProcessedInputTick,
          x: slot.player.transform.x,
          y: slot.player.transform.y,
          angle: slot.player.transform.angle,
          health: slot.player.health,
          isHooked: slot.player.isHooked ? 1 : 0,
          hookPhase: hook.phase,
          hookX: hook.x,
          hookY: hook.y,
        }
      }),
    }

    const buffer = encodeSnapshot(snapshot)
    for (const slot of this.#slots) {
      if (slot.ws.readyState === slot.ws.OPEN) slot.ws.send(buffer)
    }
  }

  #hookInfo(player) {
    if (player.hookId === null) return { phase: HOOK_PHASE.NONE, x: 0, y: 0 }

    const hook = this.#manager.get(player.hookId)
    if (!hook) return { phase: HOOK_PHASE.NONE, x: 0, y: 0 }

    return {
      phase:
        hook.phase === "attached" ? HOOK_PHASE.ATTACHED : HOOK_PHASE.FLYING,
      x: hook.transform.x,
      y: hook.transform.y,
    }
  }
}
