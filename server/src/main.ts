import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { WsAdapter } from "@nestjs/platform-ws"
import { AppModule } from "./app.module.js"

const PORT = Number(process.env.PORT ?? 8080)

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // Nest defaults to a Socket.IO adapter — WsAdapter swaps in the raw `ws`
  // library instead, same requirement as Lab 4 ("you're learning the
  // protocol, not a wrapper").
  app.useWebSocketAdapter(new WsAdapter(app))
  await app.listen(PORT)
  console.log(`Hookline signaling server listening on :${PORT}`)
}

bootstrap()
