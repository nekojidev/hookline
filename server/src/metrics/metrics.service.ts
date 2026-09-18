import { Injectable } from "@nestjs/common"

export interface MetricsSnapshot {
  connectedClients: number
  activeMatches: number
  roomsWaiting: number
}

// Plain in-memory counters, not Prometheus — at this scale a JSON snapshot
// behind an HTTP endpoint is the honest amount of observability to build,
// not a metrics stack nobody's operating.
@Injectable()
export class MetricsService {
  private connectedClients = 0
  private activeMatches = 0
  private roomsWaiting = 0

  clientConnected(): void {
    this.connectedClients += 1
  }

  clientDisconnected(): void {
    this.connectedClients = Math.max(0, this.connectedClients - 1)
  }

  matchStarted(): void {
    this.activeMatches += 1
  }

  matchStopped(): void {
    this.activeMatches = Math.max(0, this.activeMatches - 1)
  }

  setRoomsWaiting(count: number): void {
    this.roomsWaiting = count
  }

  snapshot(): MetricsSnapshot {
    return {
      connectedClients: this.connectedClients,
      activeMatches: this.activeMatches,
      roomsWaiting: this.roomsWaiting,
    }
  }
}
