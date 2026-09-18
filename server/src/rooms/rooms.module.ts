import { Module } from "@nestjs/common"
import { MatchLogModule } from "../match-log/match-log.module.js"
import { RoomManagerService } from "./room-manager.service.js"
import { RoomsGateway } from "./rooms.gateway.js"

@Module({
  imports: [MatchLogModule],
  providers: [RoomManagerService, RoomsGateway],
})
export class RoomsModule {}
