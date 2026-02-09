import type {
  ChaosConfig,
  ChaosEvent,
  ChaosType,
  ChaosTypeConfig,
  DeepPartial,
  FailureMode,
  TargetPattern,
} from "../types";
import { Logger } from "./Logger";
import { Randomizer } from "./Randomizer";
import { Scheduler } from "./Scheduler";

type Subscriber = (event: ChaosEvent) => void;

const DEFAULT_CONFIG: ChaosConfig = {
  enabled: true,
  chaos: {
    defaultProbability: 0.3,
    delayRange: [100, 3000],
  },
  microscopic: {
    state: { enabled: true },
    effect: { enabled: true },
    context: { enabled: true },
    async: { enabled: true },
  },
  macroscopic: {
    render: { enabled: true },
    mount: { enabled: true },
    unmount: { enabled: true },
    lazy: { enabled: true },
  },
  targeting: {
    include: [],
    exclude: [],
  },
  scheduling: {
    pattern: "continuous",
  },
  logging: {
    enabled: true,
    level: "info",
  },
  devtools: {
    enabled: true,
    showIndicator: true,
    hotkey: "ctrl+shift+v",
  },
};

function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const result = { ...target } as Record<string, unknown>;
  const src = source as Record<string, unknown>;
  for (const key in src) {
    const sourceVal = src[key];
    const targetVal = result[key];
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      !(sourceVal instanceof RegExp)
    ) {
      result[key] = deepMerge(
        (targetVal as Record<string, unknown>) ?? {},
        sourceVal as DeepPartial<Record<string, unknown>>,
      );
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }
  return result as T;
}

let eventCounter = 0;

export class ChaosEngine {
  private config: ChaosConfig;
  private randomizer: Randomizer;
  private logger: Logger;
  private scheduler: Scheduler;
  private subscribers = new Set<Subscriber>();
  private running = false;

  constructor(config: DeepPartial<ChaosConfig> = {}) {
    this.config = deepMerge(DEFAULT_CONFIG, config);
    this.randomizer = new Randomizer(this.config.chaos.seed);
    this.logger = new Logger(
      this.config.logging.level,
      this.config.logging.transport,
    );
    this.scheduler = new Scheduler(
      this.config.scheduling.pattern,
      this.config.scheduling.burstInterval,
      this.config.scheduling.schedule,
    );
  }

  start(): void {
    this.running = true;
    this.scheduler.start();
  }

  stop(): void {
    this.running = false;
    this.scheduler.stop();
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): Readonly<ChaosConfig> {
    return this.config;
  }

  getSeed(): number {
    return this.randomizer.seed;
  }

  updateConfig(partial: DeepPartial<ChaosConfig>): void {
    this.config = deepMerge(this.config, partial);

    if (partial.chaos?.seed !== undefined) {
      this.randomizer = new Randomizer(partial.chaos.seed);
    }
    if (partial.logging) {
      if (partial.logging.level) this.logger.setLevel(partial.logging.level);
      if (partial.logging.transport !== undefined) {
        this.logger.setTransport(partial.logging.transport ?? null);
      }
    }
    if (partial.scheduling?.pattern) {
      this.scheduler.setPattern(partial.scheduling.pattern);
    }
  }

  shouldTrigger(
    type: ChaosType,
    target: string,
    overrideProbability?: number,
  ): boolean {
    if (!this.config.enabled || !this.running) return false;
    if (!this.scheduler.isActive()) return false;

    const typeConfig = this.getTypeConfig(type);
    if (!typeConfig.enabled) return false;

    if (!this.matchesTarget(target)) return false;

    const probability =
      overrideProbability ??
      typeConfig.probability ??
      this.config.chaos.defaultProbability;

    return this.randomizer.shouldTrigger(probability);
  }

  selectFailure<F extends FailureMode>(
    type: ChaosType,
    allowedFailures?: F[],
  ): F {
    const typeConfig = this.getTypeConfig(type);
    const failures = (allowedFailures ?? typeConfig.failures ?? []) as F[];
    if (failures.length === 0) {
      throw new Error(`No failure modes configured for chaos type: ${type}`);
    }
    return this.randomizer.pick(failures);
  }

  getDelay(): number {
    const [min, max] = this.config.chaos.delayRange;
    return this.randomizer.intInRange(min, max);
  }

  emitEvent(event: Omit<ChaosEvent, "id" | "timestamp">): ChaosEvent {
    const fullEvent: ChaosEvent = {
      ...event,
      id: `chaos-${++eventCounter}`,
      timestamp: Date.now(),
    };

    if (this.config.logging.enabled) {
      this.logger.log(fullEvent);
    }

    for (const subscriber of this.subscribers) {
      try {
        subscriber(fullEvent);
      } catch {
        // subscriber errors should not break the engine
      }
    }

    return fullEvent;
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getEventHistory(): readonly ChaosEvent[] {
    return this.logger.getHistory();
  }

  clearHistory(): void {
    this.logger.clear();
  }

  getRandomizer(): Randomizer {
    return this.randomizer;
  }

  private getTypeConfig(type: ChaosType): ChaosTypeConfig {
    if (type in this.config.microscopic) {
      return this.config.microscopic[type as keyof typeof this.config.microscopic];
    }
    return this.config.macroscopic[type as keyof typeof this.config.macroscopic];
  }

  private matchesTarget(target: string): boolean {
    const { include, exclude } = this.config.targeting;

    if (exclude.length > 0 && exclude.some((p) => this.matchPattern(p, target))) {
      return false;
    }

    if (include.length > 0) {
      return include.some((p) => this.matchPattern(p, target));
    }

    return true;
  }

  private matchPattern(pattern: TargetPattern, target: string): boolean {
    if (pattern.pattern instanceof RegExp) {
      return pattern.pattern.test(target);
    }
    return target.includes(pattern.pattern);
  }
}
