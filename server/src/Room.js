export class Room {
  #members = new Map() // id -> { ws, name }

  constructor(id) {
    this.id = id
  }

  get size() {
    return this.#members.size
  }

  join(id, ws, name) {
    this.#members.set(id, { ws, name })
  }

  leave(id) {
    this.#members.delete(id)
  }

  listMembers() {
    return [...this.#members.entries()].map(([id, member]) => ({
      id,
      name: member.name,
    }))
  }

  broadcast(message, excludeId) {
    const payload = JSON.stringify(message)
    for (const [id, member] of this.#members) {
      if (id === excludeId) continue
      if (member.ws.readyState === member.ws.OPEN) member.ws.send(payload)
    }
  }
}
