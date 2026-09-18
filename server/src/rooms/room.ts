import type { ServerMessage } from "hookline-shared/src/messages.js"
import type WebSocket from "ws"

interface Member {
  ws: WebSocket
  name: string
}

export class Room {
  #members = new Map<string, Member>()

  constructor(readonly id: string) {}

  get size(): number {
    return this.#members.size
  }

  join(id: string, ws: WebSocket, name: string): void {
    this.#members.set(id, { ws, name })
  }

  leave(id: string): void {
    this.#members.delete(id)
  }

  listMembers(): { id: string; name: string }[] {
    return [...this.#members.entries()].map(([id, member]) => ({
      id,
      name: member.name,
    }))
  }

  broadcast(message: ServerMessage, excludeId?: string): void {
    const payload = JSON.stringify(message)
    for (const [id, member] of this.#members) {
      if (id === excludeId) continue
      if (member.ws.readyState === member.ws.OPEN) member.ws.send(payload)
    }
  }
}
