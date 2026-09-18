import { createAudioSystem } from "./audio/audioSystem.js"
import { ARENA } from "./constants.js"
import { GameStateMachine } from "./state/GameStateMachine.js"
import { createLoadingState } from "./state/LoadingState.js"
import { createLobbyState } from "./state/LobbyState.js"
import { createPlayingState } from "./state/PlayingState.js"

const dom = {
  loadingScreen: document.querySelector("#loading-screen"),
  progressBar: document.querySelector("#progress-bar"),
  progressLabel: document.querySelector("#progress-label"),
  cancelLoading: document.querySelector("#cancel-loading"),
  lobbyScreen: document.querySelector("#lobby-screen"),
  startButton: document.querySelector("#start-button"),
  gameScreen: document.querySelector("#game-screen"),
}

const canvas = document.querySelector("#game")
canvas.width = ARENA.width
canvas.height = ARENA.height
const ctx = canvas.getContext("2d")

// Created suspended — browsers block audio until a user gesture, which is
// why resume() happens in the lobby's "start" click, not here.
const audioContext = new AudioContext()
let audioSystem = null

const machine = new GameStateMachine()

const playingState = createPlayingState({ ctx, dom })

const lobbyState = createLobbyState({
  dom,
  getAudioSystem: () => audioSystem,
  onStart: () => machine.transitionTo(playingState),
})

const loadingState = createLoadingState({
  audioContext,
  dom,
  onComplete: (buffers) => {
    audioSystem = createAudioSystem(buffers)
    machine.transitionTo(lobbyState)
  },
})

machine.transitionTo(loadingState)
