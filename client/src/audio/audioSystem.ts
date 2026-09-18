import { gameEvents } from "hookline-shared/src/gameEvents.js"

const SFX_BY_EVENT: Record<string, string> = {
  "hook:fired": "hookFire",
  "hook:attached": "hookHit",
  "hook:missed": "hookMiss",
}

const AMBIENT_TARGET_GAIN = 0.5
const FADE_STEPS = 20

export interface AudioSystem {
  resume: () => Promise<void>
  startAmbient: () => void
  stopAmbient: () => void
}

// Listens on the shared event bus instead of being called directly by
// hookSystem — the simulation has no idea audio exists. `buffers` is the
// Map produced by loadAudioAssets() during the loading screen.
export function createAudioSystem(
  buffers: Map<string, AudioBuffer>,
): AudioSystem {
  const context = new AudioContext()
  let ambientSource: AudioBufferSourceNode | null = null
  let ambientGain: GainNode | null = null
  let fadeController: AbortController | null = null

  function playOneShot(key: string) {
    const buffer = buffers.get(key)
    if (!buffer) return

    const source = context.createBufferSource()
    source.buffer = buffer
    source.connect(context.destination)
    source.start()
  }

  for (const [eventName, bufferKey] of Object.entries(SFX_BY_EVENT)) {
    gameEvents.addEventListener(eventName, () => playOneShot(bufferKey))
  }

  // Cooperatively cancellable fade: if startAmbient/stopAmbient is called
  // again before a fade finishes, the previous fade's abort signal stops it
  // from fighting over `gain.value` with the new one.
  async function fadeGain(
    gainNode: GainNode,
    from: number,
    to: number,
    durationMs: number,
    signal: AbortSignal,
  ) {
    gainNode.gain.value = from
    for (let step = 1; step <= FADE_STEPS; step++) {
      if (signal.aborted) return
      await wait(durationMs / FADE_STEPS)
      if (signal.aborted) return
      gainNode.gain.value = from + (to - from) * (step / FADE_STEPS)
    }
  }

  function startAmbient() {
    if (ambientSource) return

    const buffer = buffers.get("riverAmbient")
    if (!buffer) return

    fadeController?.abort()
    fadeController = new AbortController()

    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const gain = context.createGain()
    gain.gain.value = 0
    source.connect(gain).connect(context.destination)
    source.start()

    ambientSource = source
    ambientGain = gain
    fadeGain(gain, 0, AMBIENT_TARGET_GAIN, 800, fadeController.signal)
  }

  function stopAmbient() {
    if (!ambientSource || !ambientGain) return

    fadeController?.abort()
    fadeController = new AbortController()

    const source = ambientSource
    const gain = ambientGain
    ambientSource = null
    ambientGain = null

    fadeGain(gain, gain.gain.value, 0, 400, fadeController.signal).then(() =>
      source.stop(),
    )
  }

  return {
    resume: () => context.resume(),
    startAmbient,
    stopAmbient,
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
