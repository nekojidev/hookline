// Simulation constants (ARENA, FIXED_STEP, hook tuning, ...) now live in
// hookline-shared — this file only keeps client-specific configuration that
// has no meaning on the server.
export const SERVER_URL = "ws://localhost:8080"
export const DEFAULT_ROOM = "main"
