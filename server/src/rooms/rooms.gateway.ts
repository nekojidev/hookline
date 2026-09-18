import { randomUUID } from "node:crypto"
import { Inject } from "@nestjs/common"
import type {
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets"
import { WebSocketGateway } from "@nestjs/websockets"
import {
  ClientMessageSchema,
  type ServerMessage,
} from "hookline-shared/src/messages.js"
import { decodeInput } from "hookline-shared/src/protocol.js"
import type WebSocket from "ws"
import { MatchLogService } from "../match-log/match-log.service.js"
import { Match, type NetId } from "../simulation/match.js"
import { RoomManagerService } from "./room-manager.service.js"

const DEFAULT_ROOM = "main"

interface ConnectionState {
  id: string
  roomId: string | null
  name: string | null
  netId: NetId | null
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Bypasses Nest's built-in @SubscribeMessage routing on purpose — that
// expects a {event, data} envelope, and reshaping our protocol to fit it
// would be changing the wire format to satisfy a framework, backwards from
// what "the framework earns its place" is supposed to mean. Nest here is
// DI/module wiring; the protocol itself is untouched from Lab 4-5.
@WebSocketGateway()
export class RoomsGateway
  implements OnGatewayConnection<WebSocket>, OnGatewayDisconnect<WebSocket>
{
  private readonly connections = new WeakMap<WebSocket, ConnectionState>()
  private readonly readyQueues = new Map<string, WebSocket[]>()
  private readonly activeMatches = new Map<string, Match>()

  // Explicit @Inject() tokens, not bare constructor-parameter types: Nest's
  // implicit type-based injection depends on emitDecoratorMetadata, which
  // esbuild (what tsx transpiles with) doesn't implement — without this,
  // both parameters below silently resolve to undefined at runtime.
  constructor(
    @Inject(RoomManagerService) private readonly rooms: RoomManagerService,
    @Inject(MatchLogService) private readonly matchLog: MatchLogService,
  ) {
    this.rooms.on(
      "playerJoined",
      (event: { roomId: string; id: string; name: string }) => {
        this.matchLog.log({ event: "join", ...event })
      },
    )
    this.rooms.on("playerLeft", (event: { roomId: string; id: string }) => {
      this.matchLog.log({ event: "leave", ...event })
    })
  }

  handleConnection(client: WebSocket): void {
    this.connections.set(client, {
      id: randomUUID(),
      roomId: null,
      name: null,
      netId: null,
    })
    client.on("message", (raw: Buffer, isBinary: boolean) =>
      this.handleMessage(client, raw, isBinary),
    )
  }

  handleDisconnect(client: WebSocket): void {
    const state = this.connections.get(client)
    if (!state?.roomId) return

    const room = this.rooms.getOrCreateRoom(state.roomId)
    this.rooms.leave(state.roomId, state.id)
    room.broadcast({ type: "system", text: `${state.name} вийшов(-ла)` })
    room.broadcast({ type: "roster", members: room.listMembers() })

    const queue = this.readyQueues.get(state.roomId)
    if (queue) {
      const index = queue.indexOf(client)
      if (index !== -1) queue.splice(index, 1)
    }

    const match = this.activeMatches.get(state.roomId)
    if (match) {
      match.stop()
      this.activeMatches.delete(state.roomId)
      room.broadcast({
        type: "system",
        text: "Матч перервано — суперник відключився",
      })
    }
  }

  private handleMessage(
    client: WebSocket,
    raw: Buffer,
    isBinary: boolean,
  ): void {
    const state = this.connections.get(client)
    if (!state) return

    if (isBinary) {
      if (state.roomId === null || state.netId === null) return
      const match = this.activeMatches.get(state.roomId)
      if (!match) return

      const arrayBuffer = raw.buffer.slice(
        raw.byteOffset,
        raw.byteOffset + raw.byteLength,
      ) as ArrayBuffer
      match.queueInput(state.netId, decodeInput(arrayBuffer))
      return
    }

    // Manual shape-checking (Lab 4) is gone — this is the "runtime
    // validation at the boundary" Lab 6 asks for: a malformed or hostile
    // frame from the client is rejected here, before any handler below
    // ever sees it, and the connection stays alive either way.
    const parsed = ClientMessageSchema.safeParse(safeJsonParse(raw.toString()))
    if (!parsed.success) return
    const message = parsed.data

    if (message.type === "join" && !state.roomId) {
      state.roomId = message.roomId ?? DEFAULT_ROOM
      state.name = message.name

      const room = this.rooms.join(state.roomId, state.id, client, state.name)
      this.send(client, {
        type: "joined",
        you: { id: state.id, name: state.name },
      })
      room.broadcast(
        { type: "system", text: `${state.name} приєднався(-лась)` },
        state.id,
      )
      room.broadcast({ type: "roster", members: room.listMembers() })
      return
    }

    if (message.type === "chat" && state.roomId) {
      const room = this.rooms.getOrCreateRoom(state.roomId)
      this.matchLog.log({
        event: "chat",
        roomId: state.roomId,
        id: state.id,
        name: state.name,
        text: message.text,
      })
      room.broadcast({
        type: "chat",
        from: state.name ?? "Гравець",
        text: message.text,
      })
      return
    }

    if (message.type === "ready" && state.roomId && state.netId === null) {
      this.handleReady(state.roomId, client)
      return
    }

    if (message.type === "buyItem" && state.roomId && state.netId !== null) {
      const match = this.activeMatches.get(state.roomId)
      const result = match
        ? match.buyItem(state.netId, message.itemId)
        : { ok: false, reason: "no active match" }
      this.send(client, {
        type: "buyResult",
        ok: result.ok,
        reason: result.reason,
      })
    }
  }

  private handleReady(roomId: string, client: WebSocket): void {
    let queue = this.readyQueues.get(roomId)
    if (!queue) {
      queue = []
      this.readyQueues.set(roomId, queue)
    }
    if (queue.includes(client)) return

    queue.push(client)
    if (queue.length < 2) return

    const [wsA, wsB] = queue.splice(0, 2) as [WebSocket, WebSocket]
    const stateA = this.connections.get(wsA)
    const stateB = this.connections.get(wsB)
    if (!stateA || !stateB) return

    stateA.netId = 0
    stateB.netId = 1

    const match = new Match([{ ws: wsA }, { ws: wsB }])
    this.activeMatches.set(roomId, match)
    match.start()

    this.send(wsA, { type: "matchStart", yourSlot: 0 })
    this.send(wsB, { type: "matchStart", yourSlot: 1 })
  }

  private send(client: WebSocket, message: ServerMessage): void {
    client.send(JSON.stringify(message))
  }
}
