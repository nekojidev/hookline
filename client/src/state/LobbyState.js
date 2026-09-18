import { DEFAULT_ROOM } from "../constants.js"

// AudioContext.resume() only succeeds after a user gesture — that's why
// ambient sound starts on the "start game" click, not on load. The chat
// connection is independent of that: it's opened once in main.js and just
// wired up here for as long as the lobby screen is visible.
export function createLobbyState({ dom, connection, getAudioSystem, onStart }) {
  function appendChatLine(text) {
    const item = document.createElement("li")
    item.textContent = text
    dom.chatLog.appendChild(item)
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight
  }

  function renderRoster(members) {
    dom.roster.textContent = members.length
      ? `У кімнаті: ${members.map((member) => member.name).join(", ")}`
      : "У кімнаті нікого немає"
  }

  function handleMessage(event) {
    const message = event.detail
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

  function handleChatSubmit(event) {
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
    audioSystem.resume()
    audioSystem.startAmbient()
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
