import { randomUUID } from "node:crypto"
import { createServer } from "node:http"
import { fileURLToPath } from "node:url"
import { decodeInput } from "hookline-shared/src/protocol.js"
import { WebSocketServer } from "ws"
import { RoomManager } from "./RoomManager.js"
import { createMatchLogger } from "./logging/matchLog.js"
import { parseClientMessage } from "./net/messageHandlers.js"
import { Match } from "./simulation/Match.js"

const PORT = process.env.PORT ?? 8080
const DEFAULT_ROOM = "main"
const MATCH_LOG_PATH = fileURLToPath(new URL("../match.log", import.meta.url))

const server = createServer()
const wss = new WebSocketServer({ server })
const rooms = new RoomManager()
const matchLog = createMatchLogger(MATCH_LOG_PATH)

// roomId -> WebSocket[] waiting for a second player to click "ready"
const readyQueues = new Map()
// roomId -> Match, only while a match is actually running
const activeMatches = new Map()

rooms.on("playerJoined", ({ roomId, id, name }) => {
  matchLog.log({ event: "join", roomId, id, name })
})
rooms.on("playerLeft", ({ roomId, id }) => {
  matchLog.log({ event: "leave", roomId, id })
})

function toArrayBuffer(nodeBuffer) {
  return nodeBuffer.buffer.slice(
    nodeBuffer.byteOffset,
    nodeBuffer.byteOffset + nodeBuffer.byteLength,
  )
}

function startMatchIfReady(roomId) {
  const queue = readyQueues.get(roomId)
  if (!queue || queue.length < 2) return

  const [wsA, wsB] = queue.splice(0, 2)
  wsA.state.netId = 0
  wsB.state.netId = 1

  const match = new Match([{ ws: wsA }, { ws: wsB }])
  activeMatches.set(roomId, match)
  match.start()

  wsA.send(JSON.stringify({ type: "matchStart", yourSlot: 0 }))
  wsB.send(JSON.stringify({ type: "matchStart", yourSlot: 1 }))
}

wss.on("connection", (ws) => {
  ws.state = { id: randomUUID(), roomId: null, name: null, netId: null }

  ws.on("message", (raw, isBinary) => {
    if (isBinary) {
      const { roomId, netId } = ws.state
      if (roomId === null || netId === null) return

      const match = activeMatches.get(roomId)
      if (!match) return

      match.queueInput(netId, decodeInput(toArrayBuffer(raw)))
      return
    }

    const message = parseClientMessage(raw.toString())
    if (!message) return

    if (message.type === "join" && !ws.state.roomId) {
      ws.state.roomId =
        typeof message.roomId === "string" ? message.roomId : DEFAULT_ROOM
      ws.state.name = String(message.name || "Гравець").slice(0, 24)

      const room = rooms.join(ws.state.roomId, ws.state.id, ws, ws.state.name)
      ws.send(
        JSON.stringify({
          type: "joined",
          you: { id: ws.state.id, name: ws.state.name },
        }),
      )
      room.broadcast(
        { type: "system", text: `${ws.state.name} приєднався(-лась)` },
        ws.state.id,
      )
      room.broadcast({ type: "roster", members: room.listMembers() })
      return
    }

    if (message.type === "chat" && ws.state.roomId) {
      const room = rooms.getOrCreateRoom(ws.state.roomId)
      const text = String(message.text || "").slice(0, 280)
      if (!text) return

      matchLog.log({
        event: "chat",
        roomId: ws.state.roomId,
        id: ws.state.id,
        name: ws.state.name,
        text,
      })
      room.broadcast({ type: "chat", from: ws.state.name, text })
      return
    }

    if (
      message.type === "ready" &&
      ws.state.roomId &&
      ws.state.netId === null
    ) {
      const { roomId } = ws.state
      let queue = readyQueues.get(roomId)
      if (!queue) {
        queue = []
        readyQueues.set(roomId, queue)
      }
      if (queue.includes(ws)) return

      queue.push(ws)
      startMatchIfReady(roomId)
    }
  })

  ws.on("close", () => {
    const { roomId, id, name } = ws.state
    if (!roomId) return

    const room = rooms.getOrCreateRoom(roomId)
    rooms.leave(roomId, id)
    room.broadcast({ type: "system", text: `${name} вийшов(-ла)` })
    room.broadcast({ type: "roster", members: room.listMembers() })

    const queue = readyQueues.get(roomId)
    if (queue) {
      const index = queue.indexOf(ws)
      if (index !== -1) queue.splice(index, 1)
    }

    const match = activeMatches.get(roomId)
    if (match) {
      match.stop()
      activeMatches.delete(roomId)
      room.broadcast({
        type: "system",
        text: "Матч перервано — суперник відключився",
      })
    }
  })
})

server.listen(PORT, () => {
  console.log(`Hookline signaling server listening on :${PORT}`)
})
