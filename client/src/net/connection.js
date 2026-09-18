// Native browser WebSocket, no client library — the point of this lab is
// to see the protocol, not wrap it. Text frames (lobby chat/roster/control
// messages, still JSON — infrequent, human-authored, no reason to make them
// binary) and binary frames (gameplay snapshots, high-frequency) are
// re-dispatched as separate CustomEvent types so callers don't have to
// sniff `event.data`'s type themselves.
export function connect(url) {
  const socket = new WebSocket(url)
  socket.binaryType = "arraybuffer"
  const events = new EventTarget()

  socket.addEventListener("open", () => events.dispatchEvent(new Event("open")))
  socket.addEventListener("close", () =>
    events.dispatchEvent(new Event("close")),
  )
  socket.addEventListener("message", (event) => {
    if (typeof event.data === "string") {
      let data
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }
      events.dispatchEvent(new CustomEvent("message", { detail: data }))
    } else {
      events.dispatchEvent(new CustomEvent("binary", { detail: event.data }))
    }
  })

  function send(message) {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(message))
  }

  function sendBinary(buffer) {
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
    sendInput(buffer) {
      sendBinary(buffer)
    },
    close() {
      socket.close()
    },
  }
}
