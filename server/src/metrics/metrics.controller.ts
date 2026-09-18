import { Controller, Get, Inject } from "@nestjs/common"
import { MetricsService } from "./metrics.service.js"

@Controller()
export class MetricsController {
  // @Inject() again, not a bare constructor-parameter type — see the note
  // in rooms.gateway.ts on why implicit injection silently breaks under tsx.
  constructor(
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  @Get("health")
  health(): { status: "ok" } {
    return { status: "ok" }
  }

  @Get("metrics")
  metricsSnapshot() {
    return this.metrics.snapshot()
  }
}
