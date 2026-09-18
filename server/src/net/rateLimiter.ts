// Token bucket, not a fixed per-second counter — bursts up to `capacity`
// are fine (a real client's input stream is naturally bursty around
// network jitter), but sustained abuse above `refillPerSecond` gets
// throttled instead of ever draining the bucket into debt.
export class RateLimiter {
  #tokens: number
  #lastRefillAt: number

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.#tokens = capacity
    this.#lastRefillAt = Date.now()
  }

  tryConsume(cost = 1): boolean {
    const now = Date.now()
    const elapsedSeconds = (now - this.#lastRefillAt) / 1000
    this.#tokens = Math.min(
      this.capacity,
      this.#tokens + elapsedSeconds * this.refillPerSecond,
    )
    this.#lastRefillAt = now

    if (this.#tokens < cost) return false
    this.#tokens -= cost
    return true
  }
}
