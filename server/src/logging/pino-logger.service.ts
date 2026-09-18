import type { LogLevel, LoggerService } from "@nestjs/common"
import pino, { type Logger } from "pino"

const LEVEL_BY_NEST: Record<LogLevel, pino.Level> = {
  verbose: "trace",
  debug: "debug",
  log: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
}

// Structured JSON on stdout instead of Nest's default colorized console
// lines — the point of "production logging" is that a log aggregator can
// parse it, not that a human staring at a terminal can. Nest's own
// LoggerService interface is implemented directly rather than pulling in
// nestjs-pino, since all we need is "route Nest's log calls through pino,"
// not its request-context middleware.
export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL ?? "info",
      base: { service: "hookline-server" },
    })
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write("log", message, optionalParams)
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write("error", message, optionalParams)
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write("warn", message, optionalParams)
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write("debug", message, optionalParams)
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write("verbose", message, optionalParams)
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write("fatal", message, optionalParams)
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const context = optionalParams.length ? { context: optionalParams } : {}
    this.logger[LEVEL_BY_NEST[level]](context, String(message))
  }
}
