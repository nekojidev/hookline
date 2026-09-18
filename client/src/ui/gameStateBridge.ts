export interface HudSnapshot {
  visible: boolean
  health: number
  gold: number
  hookCooldownRemaining: number
  hookCooldownTotal: number
  buyMessage: string | null
}

export const INITIAL_HUD_SNAPSHOT: HudSnapshot = {
  visible: false,
  health: 100,
  gold: 0,
  hookCooldownRemaining: 0,
  hookCooldownTotal: 0,
  buyMessage: null,
}

export type Listener = () => void

// Plain pub/sub, not Redux/Zustand — the HUD's state is small enough that
// another dependency doesn't earn its place. React subscribes via
// useSyncExternalStore(); PlayingState is the only writer, pushing updates
// throttled to ~10Hz rather than every 50Hz simulation tick.
export function createGameStateBridge(
  initial: HudSnapshot = INITIAL_HUD_SNAPSHOT,
) {
  let snapshot = initial
  const listeners = new Set<Listener>()

  return {
    set(next: HudSnapshot): void {
      snapshot = next
      for (const listener of listeners) listener()
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot(): HudSnapshot {
      return snapshot
    },
  }
}

export type GameStateBridge = ReturnType<typeof createGameStateBridge>
