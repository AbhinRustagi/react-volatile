import type { ChaosEvent, LogTransport } from "../types";

type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class Logger {
  private level: LogLevel;
  private transport: LogTransport | null;
  private history: ChaosEvent[] = [];
  private maxHistory: number;

  constructor(
    level: LogLevel = "info",
    transport?: LogTransport,
    maxHistory = 1000,
  ) {
    this.level = level;
    this.transport = transport ?? null;
    this.maxHistory = maxHistory;
  }

  log(event: ChaosEvent, level: LogLevel = "info"): void {
    if (LOG_PRIORITY[level] > LOG_PRIORITY[this.level]) return;

    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    if (this.transport) {
      try {
        this.transport.send(event);
      } catch {
        // transport failures should not break chaos injection
      }
    }

    if (typeof console !== "undefined") {
      const prefix = `[volatile:${event.type}]`;
      const message = `${prefix} ${event.failure} on ${event.target}`;
      switch (level) {
        case "error":
          console.error(message, event);
          break;
        case "warn":
          console.warn(message, event);
          break;
        case "debug":
          console.debug(message, event);
          break;
        default:
          console.log(message, event);
      }
    }
  }

  getHistory(): readonly ChaosEvent[] {
    return this.history;
  }

  clear(): void {
    this.history = [];
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  setTransport(transport: LogTransport | null): void {
    this.transport = transport;
  }
}
