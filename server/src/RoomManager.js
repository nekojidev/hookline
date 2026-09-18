import { EventEmitter } from "node:events"
import { Room } from "./Room.js"

// extends EventEmitter — this is Node's own building block, not a
// convenience wrapper: join/leave become events other parts of the server
// (the match logger, later metrics) can subscribe to without RoomManager
// knowing they exist.
export class RoomManager extends EventEmitter {
  #rooms = new Map()

  getOrCreateRoom(roomId) {
    let room = this.#rooms.get(roomId)
    if (!room) {
      room = new Room(roomId)
      this.#rooms.set(roomId, room)
    }
    return room
  }

  join(roomId, id, ws, name) {
    const room = this.getOrCreateRoom(roomId)
    room.join(id, ws, name)
    this.emit("playerJoined", { roomId, id, name })
    return room
  }

  leave(roomId, id) {
    const room = this.#rooms.get(roomId)
    if (!room) return

    room.leave(id)
    this.emit("playerLeft", { roomId, id })

    if (room.size === 0) this.#rooms.delete(roomId)
  }
}
