import { Module } from "@nestjs/common"
import { MatchLogService } from "./match-log.service.js"

@Module({
  providers: [MatchLogService],
  exports: [MatchLogService],
})
export class MatchLogModule {}
