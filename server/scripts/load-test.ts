// Spins up N independent bot matches against a running server — each pair
// joins its own room, readies up, and sends random movement + occasional
// hook fires at the same 50Hz rate a real client would. This is what
// stands in for "load test the server with N concurrent bots" without a
// browser: every bot pair drives one authoritative Match tick loop and
// writes through the same backpressure-aware match logger, so N pairs is a
// real concurrency test of RoomsGateway + Match + MatchLogService, not a
// simulation of one.
//
// Usage: npm run load-test [pairCount] [durationMs]
import { encodeInput } from "hookline-shared/src/protocol.js"
import { WebSocket } from "ws"

const SERVER_URL = process.env.SERVER_URL ?? "ws://localhost:8080"
const PAIR_COUNT = Number(process.argv[2] ?? 20)
const DURATION_MS = Number(process.argv[3] ?? 5000)
const TICK_MS = 20 // matches FIXED_STEP (1/50s) on the server

function once(socket: WebSocket, event: string): Promise<void> {
  return new Promise((resolve) => socket.once(event, () => resolve()))
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runBotPair(
  pairIndex: number,
): Promise<{ pairIndex: number; errors: number }> {
  const roomId = `bot-room-${pairIndex}`
  const a = new WebSocket(SERVER_URL)
  const b = new WebSocket(SERVER_URL)
  let errors = 0
  a.on("error", () => errors++)
  b.on("error", () => errors++)

  await Promise.all([once(a, "open"), once(b, "open")])
  a.send(JSON.stringify({ type: "join", roomId, name: `BotA${pairIndex}` }))
  b.send(JSON.stringify({ type: "join", roomId, name: `BotB${pairIndex}` }))
  await wait(50)
  a.send(JSON.stringify({ type: "ready" }))
  b.send(JSON.stringify({ type: "ready" }))

  let tick = 1
  const interval = setInterval(() => {
    for (const socket of [a, b]) {
      if (socket.readyState !== WebSocket.OPEN) continue
      socket.send(
        encodeInput({
          tick,
          moveX: Math.random() * 2 - 1,
          moveY: Math.random() * 2 - 1,
          fireHook: Math.random() < 0.05,
          aimAngle: Math.random() * Math.PI * 2,
        }),
      )
    }
    tick += 1
  }, TICK_MS)

  await wait(DURATION_MS)
  clearInterval(interval)
  a.close()
  b.close()

  return { pairIndex, errors }
}

async function main() {
  console.log(
    `Spawning ${PAIR_COUNT} bot matches (${PAIR_COUNT * 2} sockets) for ${DURATION_MS}ms against ${SERVER_URL}...`,
  )
  const startedAt = performance.now()

  const results = await Promise.all(
    Array.from({ length: PAIR_COUNT }, (_, i) => runBotPair(i)),
  )

  const elapsed = performance.now() - startedAt
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)

  console.log(
    `Done in ${elapsed.toFixed(0)}ms — ${PAIR_COUNT} matches, ${totalErrors} socket errors.`,
  )
  if (totalErrors > 0) process.exitCode = 1
}

main()
