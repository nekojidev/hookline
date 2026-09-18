import { randomUUID } from "node:crypto"
import { createServer } from "node:http"
import { fileURLToPath } from "node:url"
import { WebSocketServer } from "ws"
import { RoomManager } from "./RoomManager.js"
import { createMatchLogger } from "./logging/matchLog.js"
import { parseClientMessage } from "./net/messageHandlers.js"

const PORT = process.env.PORT ?? 8080
const DEFAULT_ROOM = "main"
const MATCH_LOG_PATH = fileURLToPath(new URL("../match.log", import.meta.url))

const server = createServer()
const wss = new WebSocketServer({ server })
const rooms = new RoomManager()
const matchLog = createMatchLogger(MATCH_LOG_PATH)

rooms.on("playerJoined", ({ roomId, id, name }) => {
  matchLog.log({ event: "join", roomId, id, name })
})
rooms.on("playerLeft", ({ roomId, id }) => {
  matchLog.log({ event: "leave", roomId, id })
})

wss.on("connection", (ws) => {
  const id = randomUUID()
  let roomId = null
  let name = null

  ws.on("message", (raw) => {
    const message = parseClientMessage(raw.toString())
    if (!message) return

    if (message.type === "join" && !roomId) {
      roomId =
        typeof message.roomId === "string" ? message.roomId : DEFAULT_ROOM
      name = String(message.name || "Гравець").slice(0, 24)

      const room = rooms.join(roomId, id, ws, name)
      ws.send(JSON.stringify({ type: "joined", you: { id, name } }))
      room.broadcast({ type: "system", text: `${name} приєднався(-лась)` }, id)
      room.broadcast({ type: "roster", members: room.listMembers() })
      return
    }

    if (message.type === "chat" && roomId) {
      const room = rooms.getOrCreateRoom(roomId)
      const text = String(message.text || "").slice(0, 280)
      if (!text) return

      matchLog.log({ event: "chat", roomId, id, name, text })
      room.broadcast({ type: "chat", from: name, text })
    }
  })

  ws.on("close", () => {
    if (!roomId) return

    const room = rooms.getOrCreateRoom(roomId)
    rooms.leave(roomId, id)
    room.broadcast({ type: "system", text: `${name} вийшов(-ла)` })
    room.broadcast({ type: "roster", members: room.listMembers() })
  })
})

server.listen(PORT, () => {
  console.log(`Hookline signaling server listening on :${PORT}`)
})
