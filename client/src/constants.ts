// Simulation constants (ARENA, FIXED_STEP, hook tuning, ...) now live in
// hookline-shared — this file only keeps client-specific configuration that
// has no meaning on the server.
export const DEFAULT_ROOM = "main"

// In production (see client/Dockerfile) VITE_SERVER_URL is baked in at
// build time as a same-origin relative path ("/ws"), which nginx proxies
// to the server container — the browser never needs the backend's real
// address. Local dev has no such env var, so it falls back to talking to
// the server directly on its dev port.
export function getServerUrl(): string {
  const configured = import.meta.env.VITE_SERVER_URL
  if (!configured) return "ws://localhost:8080"
  if (configured.startsWith("ws://") || configured.startsWith("wss://"))
    return configured

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  return `${protocol}//${window.location.host}${configured}`
}
