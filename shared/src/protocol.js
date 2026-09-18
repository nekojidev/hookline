// Fixed-size binary layouts via DataView instead of JSON.stringify — the
// match is always exactly 2 players, so there's no need for count-prefixed
// arrays; every offset below is a compile-time constant.
//
// Size comparison (why this exists): the JSON equivalent of one input frame
// (`{"type":"input","tick":123,"moveX":0.71,"moveY":-0.71,"fireHook":false,
// "aimAngle":1.5708}`) runs ~85-95 bytes as UTF-8 text. The binary frame
// below is 11 bytes — about 8x smaller, and it's the packet sent every
// single simulation tick (50/s) in both directions.

const HOOK_PHASE = { NONE: 0, FLYING: 1, ATTACHED: 2 }

const SLOT_COUNT = 2
const SLOT_SIZE =
  1 + // connected
  4 + // ackInputTick
  4 + // x
  4 + // y
  4 + // angle
  1 + // health
  1 + // isHooked
  1 + // hookPhase
  4 + // hookX
  4 // hookY
export const SNAPSHOT_SIZE = 4 + SLOT_COUNT * SLOT_SIZE // + serverTick

export function encodeSnapshot(snapshot) {
  const buffer = new ArrayBuffer(SNAPSHOT_SIZE)
  const view = new DataView(buffer)
  let offset = 0

  view.setUint32(offset, snapshot.serverTick)
  offset += 4

  for (const slot of snapshot.slots) {
    view.setUint8(offset, slot.connected ? 1 : 0)
    offset += 1
    view.setUint32(offset, slot.ackInputTick)
    offset += 4
    view.setFloat32(offset, slot.x)
    offset += 4
    view.setFloat32(offset, slot.y)
    offset += 4
    view.setFloat32(offset, slot.angle)
    offset += 4
    view.setUint8(offset, slot.health)
    offset += 1
    view.setUint8(offset, slot.isHooked ? 1 : 0)
    offset += 1
    view.setUint8(offset, slot.hookPhase)
    offset += 1
    view.setFloat32(offset, slot.hookX)
    offset += 4
    view.setFloat32(offset, slot.hookY)
    offset += 4
  }

  return buffer
}

export function decodeSnapshot(buffer) {
  const view = new DataView(buffer)
  let offset = 0

  const serverTick = view.getUint32(offset)
  offset += 4

  const slots = []
  for (let i = 0; i < SLOT_COUNT; i++) {
    const connected = view.getUint8(offset) === 1
    offset += 1
    const ackInputTick = view.getUint32(offset)
    offset += 4
    const x = view.getFloat32(offset)
    offset += 4
    const y = view.getFloat32(offset)
    offset += 4
    const angle = view.getFloat32(offset)
    offset += 4
    const health = view.getUint8(offset)
    offset += 1
    const isHooked = view.getUint8(offset) === 1
    offset += 1
    const hookPhase = view.getUint8(offset)
    offset += 1
    const hookX = view.getFloat32(offset)
    offset += 4
    const hookY = view.getFloat32(offset)
    offset += 4

    slots.push({
      connected,
      ackInputTick,
      x,
      y,
      angle,
      health,
      isHooked,
      hookPhase,
      hookX,
      hookY,
    })
  }

  return { serverTick, slots }
}

const INPUT_SIZE = 4 + 1 + 1 + 1 + 4 // tick, moveX, moveY, fireHook, aimAngle

export function encodeInput(input) {
  const buffer = new ArrayBuffer(INPUT_SIZE)
  const view = new DataView(buffer)
  let offset = 0

  view.setUint32(offset, input.tick)
  offset += 4
  view.setInt8(offset, Math.round(input.moveX * 100))
  offset += 1
  view.setInt8(offset, Math.round(input.moveY * 100))
  offset += 1
  view.setUint8(offset, input.fireHook ? 1 : 0)
  offset += 1
  view.setFloat32(offset, input.aimAngle)
  offset += 4

  return buffer
}

export function decodeInput(buffer) {
  const view = new DataView(buffer)
  let offset = 0

  const tick = view.getUint32(offset)
  offset += 4
  const moveX = view.getInt8(offset) / 100
  offset += 1
  const moveY = view.getInt8(offset) / 100
  offset += 1
  const fireHook = view.getUint8(offset) === 1
  offset += 1
  const aimAngle = view.getFloat32(offset)
  offset += 4

  return { tick, moveX, moveY, fireHook, aimAngle }
}

export { HOOK_PHASE, INPUT_SIZE }
