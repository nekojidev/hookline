import type { Hook } from "./Hook.js"
import type { Player } from "./Player.js"
import type { Tree } from "./Tree.js"

export type GameEntity = Player | Hook | Tree
type EntityOfType<T extends GameEntity["type"]> = Extract<
  GameEntity,
  { type: T }
>

export class EntityManager {
  #entities = new Map<number, GameEntity>()

  add<T extends GameEntity>(entity: T): T {
    this.#entities.set(entity.id, entity)
    return entity
  }

  remove(id: number): void {
    this.#entities.delete(id)
  }

  get(id: number): GameEntity | undefined {
    return this.#entities.get(id)
  }

  // The generic ties the string argument to the return type: query("player")
  // gives back Player[], not GameEntity[] — no cast needed at call sites.
  query<T extends GameEntity["type"]>(type: T): EntityOfType<T>[] {
    return [...this.#entities.values()].filter(
      (entity): entity is EntityOfType<T> => entity.type === type,
    )
  }
}
