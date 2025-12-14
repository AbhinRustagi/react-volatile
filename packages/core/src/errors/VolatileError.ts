import type { ChaosType, FailureMode } from "../types";

export class VolatileError extends Error {
  readonly chaosType: ChaosType;
  readonly failure: FailureMode;
  readonly target: string;
  readonly component?: string;
  readonly isVolatile = true as const;

  constructor(
    chaosType: ChaosType,
    failure: FailureMode,
    target: string,
    component?: string,
  ) {
    const message = `[Volatile] ${chaosType}:${failure} on ${target}${component ? ` in <${component}>` : ""}`;
    super(message);
    this.name = "VolatileError";
    this.chaosType = chaosType;
    this.failure = failure;
    this.target = target;
    this.component = component;
  }

  static isVolatileError(error: unknown): error is VolatileError {
    return error instanceof VolatileError;
  }
}
