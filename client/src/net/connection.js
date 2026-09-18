// Native browser WebSocket, no client library — the point of this lab is
// to see the protocol, not wrap it. Incoming frames are re-dispatched as
// CustomEvents on a plain EventTarget so the rest of the client (LobbyState)
// doesn't touch the socket directly.
export function connect(url) {
  const socket = new WebSocket(url)
  const events = new EventTarget()

  socket.addEventListener("open", () => events.dispatchEvent(new Event("open")))
  socket.addEventListener("close", () =>
    events.dispatchEvent(new Event("close")),
  )
  socket.addEventListener("message", (event) => {
    let data
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    events.dispatchEvent(new CustomEvent("message", { detail: data }))
  })

  function send(message) {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(message))
  }

  return {
    events,
    join(roomId, name) {
      send({ type: "join", roomId, name })
    },
    chat(text) {
      send({ type: "chat", text })
    },
    close() {
      socket.close()
    },
  }
}
