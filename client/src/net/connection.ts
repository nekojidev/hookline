import type {
  ClientMessage,
  ServerMessage,
} from "hookline-shared/src/messages.js"

export interface Connection {
  events: EventTarget
  join: (roomId: string, name: string) => void
  chat: (text: string) => void
  ready: () => void
  buyItem: (itemId: string) => void
  sendInput: (buffer: ArrayBuffer) => void
  close: () => void
}

// Native browser WebSocket, no client library — the point of this lab is
// to see the protocol, not wrap it. Text frames (lobby chat/roster/control
// messages, still JSON — infrequent, human-authored, no reason to make them
// binary) and binary frames (gameplay snapshots, high-frequency) are
// re-dispatched as separate CustomEvent types so callers don't have to
// sniff `event.data`'s type themselves.
//
// Incoming messages are typed as ServerMessage but not runtime-validated —
// unlike the server (Lab 6's zod boundary), the client trusts its own
// server's output. Validating untrusted input is the security-relevant
// direction; re-checking your own server's shape here has little payoff.
export function connect(url: string): Connection {
  const socket = new WebSocket(url)
  socket.binaryType = "arraybuffer"
  const events = new EventTarget()

  socket.addEventListener("open", () => events.dispatchEvent(new Event("open")))
  socket.addEventListener("close", () =>
    events.dispatchEvent(new Event("close")),
  )
  socket.addEventListener(
    "message",
    (event: MessageEvent<string | ArrayBuffer>) => {
      if (typeof event.data === "string") {
        let data: ServerMessage
        try {
          data = JSON.parse(event.data) as ServerMessage
        } catch {
          return
        }
        events.dispatchEvent(
          new CustomEvent<ServerMessage>("message", { detail: data }),
        )
      } else {
        events.dispatchEvent(
          new CustomEvent<ArrayBuffer>("binary", { detail: event.data }),
        )
      }
    },
  )

  function send(message: ClientMessage) {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(message))
  }

  function sendBinary(buffer: ArrayBuffer) {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(buffer)
  }

  return {
    events,
    join(roomId, name) {
      send({ type: "join", roomId, name })
    },
    chat(text) {
      send({ type: "chat", text })
    },
    ready() {
      send({ type: "ready" })
    },
    buyItem(itemId) {
      send({ type: "buyItem", itemId })
    },
    sendInput(buffer) {
      sendBinary(buffer)
    },
    close() {
      socket.close()
    },
  }
}
