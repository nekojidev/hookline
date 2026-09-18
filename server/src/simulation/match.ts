import {
  ARENA,
  FIXED_STEP,
  RIVER,
  TREE_Y_POSITIONS,
} from "hookline-shared/src/constants.js"
import { EntityManager } from "hookline-shared/src/entities/EntityManager.js"
import { Player } from "hookline-shared/src/entities/Player.js"
import { createTree } from "hookline-shared/src/entities/Tree.js"
import {
  HOOK_PHASE,
  type HookWirePhase,
  type InputCommand,
  type Snapshot,
  type SnapshotSlot,
  encodeSnapshot,
} from "hookline-shared/src/protocol.js"
import { findShopItem } from "hookline-shared/src/shop.js"
import {
  fireHook,
  updateHooks,
} from "hookline-shared/src/systems/hookSystem.js"
import { updatePlayerMovement } from "hookline-shared/src/systems/movementSystem.js"
import type WebSocket from "ws"

export type NetId = 0 | 1

interface MatchSlot {
  ws: WebSocket
  player: Player
  inputQueue: InputCommand[]
  lastProcessedInputTick: number
}

export interface BuyResult {
  ok: boolean
  reason?: string
}

const SPAWN = [
  { x: ARENA.width / 4, color: "#e0a458", label: "P1" },
  { x: (ARENA.width / 4) * 3, color: "#5aa9e6", label: "P2" },
] as const

// The one authoritative copy of the simulation for a single 1v1 match. Both
// client prediction and this loop call the exact same shared/systems
// functions — that's the whole point of the shared/ workspace: the physics
// isn't reimplemented per-runtime, so client and server can't disagree on
// what a given input does.
export class Match {
  #manager = new EntityManager()
  #slots: [MatchSlot, MatchSlot]
  #serverTick = 0
  #intervalHandle: ReturnType<typeof setInterval> | null = null

  constructor(clients: [{ ws: WebSocket }, { ws: WebSocket }]) {
    // Literal indices 0/1 into SPAWN, not a generic `number` from .map()'s
    // index param — that's what lets TS resolve these without an
    // unnecessary "possibly undefined" from noUncheckedIndexedAccess.
    this.#slots = [
      this.#createSlot(clients[0].ws, SPAWN[0]),
      this.#createSlot(clients[1].ws, SPAWN[1]),
    ]

    const treeX = RIVER.x + RIVER.width / 2
    for (const treeY of TREE_Y_POSITIONS) {
      this.#manager.add(createTree(treeX, treeY))
    }
  }

  #createSlot(ws: WebSocket, spawn: (typeof SPAWN)[number]): MatchSlot {
    const player = this.#manager.add(
      new Player(spawn.x, ARENA.height / 2, {
        color: spawn.color,
        label: spawn.label,
      }),
    )
    return { ws, player, inputQueue: [], lastProcessedInputTick: 0 }
  }

  queueInput(netId: NetId, input: InputCommand): void {
    this.#slots[netId].inputQueue.push(input)
  }

  buyItem(netId: NetId, itemId: string): BuyResult {
    const slot = this.#slots[netId]
    const item = findShopItem(itemId)
    if (!item) return { ok: false, reason: "unknown item" }
    if (slot.player.gold < item.cost)
      return { ok: false, reason: "not enough gold" }

    slot.player.gold -= item.cost
    item.apply(slot.player)
    return { ok: true }
  }

  start(): void {
    this.#intervalHandle = setInterval(() => this.#tick(), FIXED_STEP * 1000)
  }

  stop(): void {
    if (this.#intervalHandle !== null) clearInterval(this.#intervalHandle)
  }

  #tick(): void {
    for (const slot of this.#slots) {
      const batch = slot.inputQueue
      slot.inputQueue = []
      if (batch.length === 0) continue

      const latest = batch[batch.length - 1]
      if (!latest) continue

      const shouldFire = batch.some((input) => input.fireHook)
      if (!slot.player.isHooked)
        updatePlayerMovement(slot.player, latest, FIXED_STEP)
      if (shouldFire) fireHook(this.#manager, slot.player, latest.aimAngle)

      slot.lastProcessedInputTick = latest.tick
    }

    updateHooks(this.#manager, FIXED_STEP)

    this.#serverTick += 1
    this.#broadcastSnapshot()
  }

  #broadcastSnapshot(): void {
    const [slotA, slotB] = this.#slots
    const snapshot: Snapshot = {
      serverTick: this.#serverTick,
      slots: [this.#slotToWire(slotA), this.#slotToWire(slotB)],
    }

    const buffer = encodeSnapshot(snapshot)
    for (const slot of this.#slots) {
      if (slot.ws.readyState === slot.ws.OPEN) slot.ws.send(buffer)
    }
  }

  #slotToWire(slot: MatchSlot): SnapshotSlot {
    const hook = this.#hookInfo(slot.player)
    return {
      connected: true,
      ackInputTick: slot.lastProcessedInputTick,
      x: slot.player.transform.x,
      y: slot.player.transform.y,
      angle: slot.player.transform.angle,
      health: Math.round(slot.player.health),
      gold: slot.player.gold,
      isHooked: slot.player.isHooked,
      hookPhase: hook.phase,
      hookX: hook.x,
      hookY: hook.y,
    }
  }

  #hookInfo(player: Player): { phase: HookWirePhase; x: number; y: number } {
    if (player.hookId === null) return { phase: HOOK_PHASE.NONE, x: 0, y: 0 }

    const hook = this.#manager.get(player.hookId)
    if (!hook || hook.type !== "hook")
      return { phase: HOOK_PHASE.NONE, x: 0, y: 0 }

    return {
      phase:
        hook.phase === "attached" ? HOOK_PHASE.ATTACHED : HOOK_PHASE.FLYING,
      x: hook.transform.x,
      y: hook.transform.y,
    }
  }
}
