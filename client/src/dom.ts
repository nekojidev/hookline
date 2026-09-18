// One shared shape for the DOM refs threaded through main.ts and every
// state — a bit more permissive than giving each state its own narrow
// Pick<...>, but the app is small enough that the duplication isn't worth it.
export interface Dom {
  loadingScreen: HTMLElement
  progressBar: HTMLElement
  progressLabel: HTMLElement
  cancelLoading: HTMLButtonElement
  lobbyScreen: HTMLElement
  playerName: HTMLInputElement
  joinRoom: HTMLButtonElement
  roster: HTMLElement
  chatLog: HTMLElement
  chatForm: HTMLFormElement
  chatInput: HTMLInputElement
  startButton: HTMLButtonElement
  gameScreen: HTMLElement
  hudRoot: HTMLElement
}
