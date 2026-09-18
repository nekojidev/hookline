// Shared pub/sub bus: simulation systems dispatch, side-effect modules
// (audio, later UI) subscribe. Neither side imports the other, so audio
// can be swapped or removed without touching hookSystem.js.
export const gameEvents = new EventTarget()
