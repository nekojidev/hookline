import { ARENA } from "hookline-shared/src/constants.js"
import { createAudioSystem } from "./audio/audioSystem.js"
import { SERVER_URL } from "./constants.js"
import { connect } from "./net/connection.js"
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
  playerName: document.querySelector("#player-name"),
  joinRoom: document.querySelector("#join-room"),
  roster: document.querySelector("#roster"),
  chatLog: document.querySelector("#chat-log"),
  chatForm: document.querySelector("#chat-form"),
  chatInput: document.querySelector("#chat-input"),
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
