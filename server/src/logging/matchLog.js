import { createWriteStream } from "node:fs"

// Append-only stream, not fs.appendFile per event — that would open/close
// the file descriptor on every single join/leave/chat line under load.
// The queue + drain handling is the actual point of this module: if the
// disk can't keep up, stream.write() returns false, and we must wait for
// 'drain' before writing more instead of letting the queue balloon in
// memory unbounded.
export function createMatchLogger(filePath) {
  const stream = createWriteStream(filePath, { flags: "a" })
  const queue = []
  let draining = false

  function pump() {
    if (draining) return

    while (queue.length > 0) {
      const line = queue.shift()
      const ok = stream.write(line)

      if (!ok) {
        draining = true
        stream.once("drain", () => {
          draining = false
          pump()
        })
        return
      }
    }
  }

  return {
    log(event) {
      queue.push(`${JSON.stringify({ ...event, at: Date.now() })}\n`)
      pump()
    },
    close() {
      stream.end()
    },
  }
}
