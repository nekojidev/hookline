// Manual shape-checking, not schema validation — zod at the protocol
// boundary is Lab 6's job, once the protocol has enough message types to
// justify it. For now this just keeps a malformed frame from crashing a
// handler that assumes `message.type` exists.
export function parseClientMessage(raw) {
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof data?.type !== "string") return null
  return data
}
