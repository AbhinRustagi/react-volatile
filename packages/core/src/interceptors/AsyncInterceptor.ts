import type { ChaosEngine } from "../engine/ChaosEngine";
import { VolatileError } from "../errors/VolatileError";

interface InterceptorOptions {
  interceptFetch?: boolean;
  interceptPromise?: boolean;
}

export class AsyncInterceptor {
  private engine: ChaosEngine;
  private originalFetch: typeof globalThis.fetch | null = null;
  private active = false;

  constructor(engine: ChaosEngine) {
    this.engine = engine;
  }

  install(options: InterceptorOptions = {}): void {
    if (this.active) return;
    this.active = true;

    if (options.interceptFetch !== false && typeof globalThis.fetch === "function") {
      this.originalFetch = globalThis.fetch;
      globalThis.fetch = this.createInterceptedFetch();
    }
  }

  uninstall(): void {
    if (!this.active) return;
    this.active = false;

    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  wrapAsync<T>(asyncFn: () => Promise<T>, target: string): Promise<T> {
    return this.maybeInjectChaos(target, () => asyncFn());
  }

  private createInterceptedFetch(): typeof globalThis.fetch {
    const self = this;
    return function volatileFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url = input instanceof Request ? input.url : String(input);
      return self.maybeInjectChaos(`fetch:${url}`, () =>
        self.originalFetch!(input, init),
      );
    };
  }

  private async maybeInjectChaos<T>(
    target: string,
    execute: () => Promise<T>,
  ): Promise<T> {
    if (!this.engine.shouldTrigger("async", target)) {
      return execute();
    }

    const failure = this.engine.selectFailure("async", ["delay", "reject", "timeout"]);

    this.engine.emitEvent({ type: "async", failure, target });

    switch (failure) {
      case "delay": {
        const delay = this.engine.getDelay();
        await new Promise((resolve) => setTimeout(resolve, delay));
        return execute();
      }
      case "reject":
        throw new VolatileError("async", "reject", target);
      case "timeout":
        await new Promise((resolve) =>
          setTimeout(resolve, this.engine.getDelay() * 3),
        );
        throw new VolatileError("async", "timeout", target);
      default:
        return execute();
    }
  }
}
