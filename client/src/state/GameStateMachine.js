// States are plain objects with optional enter()/exit()/update()/draw() —
// no base class needed, there's no shared behavior to inherit, just a
// common shape the machine calls into.
export class GameStateMachine {
  #current = null

  transitionTo(state) {
    this.#current?.exit?.()
    this.#current = state
    this.#current.enter?.()
  }

  update(dt) {
    this.#current?.update?.(dt)
  }

  draw(ctx) {
    this.#current?.draw?.(ctx)
  }
}
