// Fetches every asset in the manifest, decodes it as audio, and resolves
// with a Map of key -> AudioBuffer once all of them are ready. `signal`
// (from an AbortController) is threaded through every fetch: if it fires
// mid-flight, the in-progress requests abort and this whole load rejects
// with an AbortError instead of quietly finishing.
export async function loadAudioAssets(
  manifest,
  { audioContext, signal, onProgress } = {},
) {
  const entries = Object.entries(manifest)
  let loaded = 0

  const decoded = await Promise.all(
    entries.map(async ([key, url]) => {
      const response = await fetch(url, { signal })
      if (!response.ok)
        throw new Error(`Failed to fetch ${url}: ${response.status}`)

      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      loaded += 1
      onProgress?.(loaded, entries.length)

      return [key, audioBuffer]
    }),
  )

  return new Map(decoded)
}
