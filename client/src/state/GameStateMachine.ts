// States are plain objects with optional enter()/exit()/update()/draw() —
// no base class needed, there's no shared behavior to inherit, just a
// common shape the machine calls into. `enter` takes `unknown[]` rather than
// a generic per-state signature: with only 3 concrete states (Loading/Lobby
// take none, Playing takes a slot number), a fully generic state machine
// would be more machinery than the problem needs.
export interface GameState {
  enter?: (...args: unknown[]) => void | Promise<void>
  exit?: () => void
  update?: (dt: number) => void
  draw?: (ctx: CanvasRenderingContext2D) => void
}

export class GameStateMachine {
  #current: GameState | null = null

  transitionTo(state: GameState, ...args: unknown[]): void {
    this.#current?.exit?.()
    this.#current = state
    this.#current.enter?.(...args)
  }

  update(dt: number): void {
    this.#current?.update?.(dt)
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.#current?.draw?.(ctx)
  }
}
