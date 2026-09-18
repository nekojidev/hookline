import { ARENA } from "hookline-shared/src/constants.js"
import type { AudioSystem } from "./audio/audioSystem.js"
import { createAudioSystem } from "./audio/audioSystem.js"
import { SERVER_URL } from "./constants.js"
import type { Dom } from "./dom.js"
import { connect } from "./net/connection.js"
import { GameStateMachine } from "./state/GameStateMachine.js"
import { createLoadingState } from "./state/LoadingState.js"
import { createLobbyState } from "./state/LobbyState.js"
import { createPlayingState } from "./state/PlayingState.js"

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing required element: ${selector}`)
  return element
}

const dom: Dom = {
  loadingScreen: requireElement("#loading-screen"),
  progressBar: requireElement("#progress-bar"),
  progressLabel: requireElement("#progress-label"),
  cancelLoading: requireElement("#cancel-loading"),
  lobbyScreen: requireElement("#lobby-screen"),
  playerName: requireElement("#player-name"),
  joinRoom: requireElement("#join-room"),
  roster: requireElement("#roster"),
  chatLog: requireElement("#chat-log"),
  chatForm: requireElement("#chat-form"),
  chatInput: requireElement("#chat-input"),
  startButton: requireElement("#start-button"),
  gameScreen: requireElement("#game-screen"),
  hudRoot: requireElement("#hud-root"),
}

const canvas = requireElement<HTMLCanvasElement>("#game")
canvas.width = ARENA.width
canvas.height = ARENA.height
const ctx = canvas.getContext("2d")
if (!ctx) throw new Error("2D canvas context unavailable")

// Created suspended — browsers block audio until a user gesture, which is
// why resume() happens in the lobby's "start" click, not here.
const audioContext = new AudioContext()
let audioSystem: AudioSystem | null = null

const connection = connect(SERVER_URL)

const machine = new GameStateMachine()

const playingState = createPlayingState({ ctx, dom, connection })

const lobbyState = createLobbyState({
  dom,
  connection,
  getAudioSystem: () => audioSystem,
  onStart: (slot) => machine.transitionTo(playingState, slot),
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
