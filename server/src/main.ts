import "reflect-metadata"
import { Logger } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { WsAdapter } from "@nestjs/platform-ws"
import { AppModule } from "./app.module.js"
import { PinoLoggerService } from "./logging/pino-logger.service.js"

const PORT = Number(process.env.PORT ?? 8080)

async function bootstrap() {
  // Passed as the app-wide logger, not registered as a DI provider — every
  // `new Logger(context)` elsewhere in the app (Nest's own internals
  // included) routes through this pino instance from here on.
  const app = await NestFactory.create(AppModule, {
    logger: new PinoLoggerService(),
  })
  app.useWebSocketAdapter(new WsAdapter(app))
  await app.listen(PORT)
  new Logger("Bootstrap").log(`Hookline signaling server listening on :${PORT}`)
}

bootstrap()
