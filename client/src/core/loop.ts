const MAX_FRAME_TIME = 0.25 // clamp huge gaps (tab backgrounded) to avoid a spiral of death

/**
 * Fixed-timestep accumulator loop: `update(fixedStep)` always advances the
 * simulation by the same dt regardless of the display's actual frame rate,
 * `render(alpha)` runs once per rendered frame with the leftover fraction
 * of a step, for interpolation later.
 */
export interface GameLoopOptions {
  fixedStep: number
  update: (dt: number) => void
  render: (alpha: number) => void
}

export interface GameLoop {
  start: () => void
  stop: () => void
}

export function createGameLoop({
  fixedStep,
  update,
  render,
}: GameLoopOptions): GameLoop {
  let rafId = 0
  let lastTime = 0
  let accumulator = 0

  function frame(now: number) {
    rafId = requestAnimationFrame(frame)
    if (lastTime === 0) {
      lastTime = now
      return
    }

    let frameTime = (now - lastTime) / 1000
    lastTime = now
    if (frameTime > MAX_FRAME_TIME) frameTime = MAX_FRAME_TIME

    accumulator += frameTime
    while (accumulator >= fixedStep) {
      update(fixedStep)
      accumulator -= fixedStep
    }

    render(accumulator / fixedStep)
  }

  return {
    start() {
      rafId = requestAnimationFrame(frame)
    },
    stop() {
      cancelAnimationFrame(rafId)
      lastTime = 0
      accumulator = 0
    },
  }
}
