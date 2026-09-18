// One-off generator for placeholder SFX — no artist on this project yet, so
// these are synthesized PCM waveforms, not recordings. Run with
// `node scripts/generate-placeholder-audio.mjs` to regenerate. Replace with
// real audio whenever that becomes available; the asset pipeline in
// src/audio/ doesn't care where the .wav files came from.

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const SAMPLE_RATE = 44100
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, "..", "public", "audio")
mkdirSync(outDir, { recursive: true })

function encodeWav(samples, sampleRate = SAMPLE_RATE) {
  const bytesPerSample = 2
  const dataSize = samples.length * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write("RIFF", 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write("WAVE", 8)
  buffer.write("fmt ", 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write("data", 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }

  return buffer
}

function envelope(t, duration, attack, releaseStart) {
  if (t < attack) return t / attack
  if (t > releaseStart)
    return Math.max(0, 1 - (t - releaseStart) / (duration - releaseStart))
  return 1
}

function generateHookFire() {
  const duration = 0.14
  const n = Math.round(duration * SAMPLE_RATE)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const freq = 950 - 650 * (t / duration)
    const env = envelope(t, duration, 0.005, 0.06)
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.5
  }
  return samples
}

function generateHookHit() {
  const duration = 0.16
  const n = Math.round(duration * SAMPLE_RATE)
  const samples = new Float32Array(n)
  let noiseState = 0
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = envelope(t, duration, 0.002, 0.05)
    const tone = Math.sin(2 * Math.PI * 180 * t)
    noiseState = noiseState * 0.85 + (Math.random() * 2 - 1) * 0.15
    samples[i] = (tone * 0.6 + noiseState * 0.7) * env * 0.6
  }
  return samples
}

function generateHookMiss() {
  const duration = 0.22
  const n = Math.round(duration * SAMPLE_RATE)
  const samples = new Float32Array(n)
  let noiseState = 0
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    const env = envelope(t, duration, 0.01, 0.15)
    const tone = Math.sin(2 * Math.PI * 110 * t)
    noiseState = noiseState * 0.9 + (Math.random() * 2 - 1) * 0.1
    samples[i] = (tone * 0.7 + noiseState * 0.3) * env * 0.4
  }
  return samples
}

// Brown noise (random walk) crossfaded at the seam so it loops with no
// audible click — a low rumble standing in for river/wind ambience.
function generateRiverAmbient() {
  const duration = 3
  const crossfade = 0.3
  const n = Math.round(duration * SAMPLE_RATE)
  const fadeSamples = Math.round(crossfade * SAMPLE_RATE)

  const raw = new Float32Array(n)
  let state = 0
  for (let i = 0; i < n; i++) {
    state = state * 0.98 + (Math.random() * 2 - 1) * 0.05
    raw[i] = state
  }

  const looped = raw.slice()
  for (let i = 0; i < fadeSamples; i++) {
    const mix = i / fadeSamples
    looped[i] = raw[i] * mix + raw[n - fadeSamples + i] * (1 - mix)
  }

  let peak = 0
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(looped[i]))
  const gain = peak > 0 ? 0.3 / peak : 1
  for (let i = 0; i < n; i++) looped[i] *= gain

  return looped
}

const assets = {
  "hook-fire.wav": generateHookFire(),
  "hook-hit.wav": generateHookHit(),
  "hook-miss.wav": generateHookMiss(),
  "river-ambient.wav": generateRiverAmbient(),
}

for (const [filename, samples] of Object.entries(assets)) {
  writeFileSync(join(outDir, filename), encodeWav(samples))
  console.log(
    `wrote ${filename} (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`,
  )
}
