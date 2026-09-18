import { Module } from "@nestjs/common"
import { MatchLogModule } from "./match-log/match-log.module.js"
import { RoomsModule } from "./rooms/rooms.module.js"

@Module({
  imports: [RoomsModule, MatchLogModule],
})
export class AppModule {}
