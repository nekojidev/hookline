export class EntityManager {
  #entities = new Map()

  add(entity) {
    this.#entities.set(entity.id, entity)
    return entity
  }

  remove(id) {
    this.#entities.delete(id)
  }

  get(id) {
    return this.#entities.get(id)
  }

  query(type) {
    return [...this.#entities.values()].filter((entity) => entity.type === type)
  }
}
