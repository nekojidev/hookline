import { EventEmitter } from "node:events"
import { Injectable } from "@nestjs/common"
import type WebSocket from "ws"
import { Room } from "./room.js"

// extends EventEmitter — this is Node's own building block, not a
// convenience wrapper: join/leave become events other parts of the server
// (the match logger) can subscribe to without RoomManagerService knowing
// they exist. Being a Nest @Injectable() doesn't change that at all.
@Injectable()
export class RoomManagerService extends EventEmitter {
  #rooms = new Map<string, Room>()

  getOrCreateRoom(roomId: string): Room {
    let room = this.#rooms.get(roomId)
    if (!room) {
      room = new Room(roomId)
      this.#rooms.set(roomId, room)
    }
    return room
  }

  join(roomId: string, id: string, ws: WebSocket, name: string): Room {
    const room = this.getOrCreateRoom(roomId)
    room.join(id, ws, name)
    this.emit("playerJoined", { roomId, id, name })
    return room
  }

  leave(roomId: string, id: string): void {
    const room = this.#rooms.get(roomId)
    if (!room) return

    room.leave(id)
    this.emit("playerLeft", { roomId, id })

    if (room.size === 0) this.#rooms.delete(roomId)
  }
}
