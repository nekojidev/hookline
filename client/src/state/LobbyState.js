// AudioContext.resume() only succeeds after a user gesture — this click is
// that gesture, which is why ambient sound starts here and not on load.
export function createLobbyState({ dom, getAudioSystem, onStart }) {
  function handleStart() {
    const audioSystem = getAudioSystem()
    audioSystem.resume()
    audioSystem.startAmbient()
    onStart()
  }

  return {
    enter() {
      dom.lobbyScreen.hidden = false
      dom.startButton.addEventListener("click", handleStart)
    },

    exit() {
      dom.lobbyScreen.hidden = true
      dom.startButton.removeEventListener("click", handleStart)
    },
  }
}
