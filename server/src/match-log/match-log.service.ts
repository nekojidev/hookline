import { type WriteStream, createWriteStream } from "node:fs"
import { fileURLToPath } from "node:url"
import { Injectable, type OnModuleDestroy } from "@nestjs/common"

export interface MatchLogEvent {
  event: string
  [key: string]: unknown
}

const MATCH_LOG_PATH = fileURLToPath(
  new URL("../../match.log", import.meta.url),
)

// Append-only stream, not fs.appendFile per event — that would open/close
// the file descriptor on every single join/leave/chat line under load.
// The queue + drain handling is the actual point of this service: if the
// disk can't keep up, stream.write() returns false, and we must wait for
// 'drain' before writing more instead of letting the queue balloon in
// memory unbounded.
@Injectable()
export class MatchLogService implements OnModuleDestroy {
  private readonly stream: WriteStream = createWriteStream(MATCH_LOG_PATH, {
    flags: "a",
  })
  private readonly queue: string[] = []
  private draining = false

  log(event: MatchLogEvent): void {
    this.queue.push(`${JSON.stringify({ ...event, at: Date.now() })}\n`)
    this.pump()
  }

  private pump(): void {
    if (this.draining) return

    while (this.queue.length > 0) {
      const line = this.queue.shift()
      if (line === undefined) return
      const ok = this.stream.write(line)

      if (!ok) {
        this.draining = true
        this.stream.once("drain", () => {
          this.draining = false
          this.pump()
        })
        return
      }
    }
  }

  onModuleDestroy(): void {
    this.stream.end()
  }
}
