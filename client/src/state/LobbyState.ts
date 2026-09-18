import type { ServerMessage } from "hookline-shared/src/messages.js"
import type { AudioSystem } from "../audio/audioSystem.js"
import { DEFAULT_ROOM } from "../constants.js"
import type { Dom } from "../dom.js"
import type { Connection } from "../net/connection.js"
import type { GameState } from "./GameStateMachine.js"

export interface LobbyStateOptions {
  dom: Dom
  connection: Connection
  getAudioSystem: () => AudioSystem | null
  onStart: (slot: 0 | 1) => void
}

// AudioContext.resume() only succeeds after a user gesture — that's why
// ambient sound starts on the "start game" click, not on load. The chat
// connection is independent of that: it's opened once in main.ts and just
// wired up here for as long as the lobby screen is visible.
export function createLobbyState({
  dom,
  connection,
  getAudioSystem,
  onStart,
}: LobbyStateOptions): GameState {
  function appendChatLine(text: string) {
    const item = document.createElement("li")
    item.textContent = text
    dom.chatLog.appendChild(item)
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight
  }

  function renderRoster(members: { id: string; name: string }[]) {
    dom.roster.textContent = members.length
      ? `У кімнаті: ${members.map((member) => member.name).join(", ")}`
      : "У кімнаті нікого немає"
  }

  function handleMessage(event: Event) {
    const message = (event as CustomEvent<ServerMessage>).detail
    if (message.type === "system") appendChatLine(`• ${message.text}`)
    else if (message.type === "chat")
      appendChatLine(`${message.from}: ${message.text}`)
    else if (message.type === "roster") renderRoster(message.members)
    else if (message.type === "matchStart") onStart(message.yourSlot)
  }

  function handleJoinClick() {
    const name = dom.playerName.value.trim() || "Гравець"
    connection.join(DEFAULT_ROOM, name)
    dom.joinRoom.disabled = true
    dom.playerName.disabled = true
  }

  function handleChatSubmit(event: SubmitEvent) {
    event.preventDefault()
    const text = dom.chatInput.value.trim()
    if (!text) return
    connection.chat(text)
    dom.chatInput.value = ""
  }

  // Only sends "ready" and waits — the actual transition to Playing happens
  // in handleMessage() once the server pairs us with an opponent and tells
  // us which slot we are via "matchStart".
  function handleStart() {
    const audioSystem = getAudioSystem()
    audioSystem?.resume()
    audioSystem?.startAmbient()
    connection.ready()
    dom.startButton.disabled = true
    dom.startButton.textContent = "Очікуємо суперника…"
  }

  return {
    enter() {
      dom.lobbyScreen.hidden = false
      connection.events.addEventListener("message", handleMessage)
      dom.joinRoom.addEventListener("click", handleJoinClick)
      dom.chatForm.addEventListener("submit", handleChatSubmit)
      dom.startButton.addEventListener("click", handleStart)
    },

    exit() {
      dom.lobbyScreen.hidden = true
      connection.events.removeEventListener("message", handleMessage)
      dom.joinRoom.removeEventListener("click", handleJoinClick)
      dom.chatForm.removeEventListener("submit", handleChatSubmit)
      dom.startButton.removeEventListener("click", handleStart)
    },
  }
}
