import { loadAudioAssets } from "../audio/assetLoader.js"
import { AUDIO_MANIFEST } from "../audio/audioManifest.js"
import type { Dom } from "../dom.js"
import type { GameState } from "./GameStateMachine.js"

export interface LoadingStateOptions {
  audioContext: AudioContext
  dom: Dom
  onComplete: (buffers: Map<string, AudioBuffer>) => void
}

// Loading is asynchronous by nature (fetch + decodeAudioData), so this
// state's enter() is itself async — the state machine doesn't need to know
// that, it just calls enter() and moves on.
export function createLoadingState({
  audioContext,
  dom,
  onComplete,
}: LoadingStateOptions): GameState {
  return {
    async enter() {
      const controller = new AbortController()

      dom.loadingScreen.hidden = false
      dom.progressBar.style.width = "0%"
      dom.progressLabel.textContent = "Завантаження асетів…"
      dom.cancelLoading.onclick = () => controller.abort()

      try {
        const buffers = await loadAudioAssets(AUDIO_MANIFEST, {
          audioContext,
          signal: controller.signal,
          onProgress: (loaded, total) => {
            dom.progressBar.style.width = `${(loaded / total) * 100}%`
            dom.progressLabel.textContent = `Завантажено ${loaded} / ${total}`
          },
        })
        onComplete(buffers)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          dom.progressLabel.textContent = "Завантаження скасовано"
        } else {
          dom.progressLabel.textContent = "Помилка завантаження асетів"
          throw error
        }
      }
    },

    exit() {
      dom.loadingScreen.hidden = true
    },
  }
}
