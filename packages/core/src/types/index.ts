export type ChaosType =
  | "state"
  | "effect"
  | "context"
  | "async"
  | "render"
  | "mount"
  | "unmount"
  | "lazy";

export type StateFailure = "delay" | "error" | "corrupt";
export type EffectFailure = "delay" | "error" | "skip";
export type AsyncFailure = "delay" | "reject" | "timeout";
export type RenderFailure = "error" | "delay" | "empty";
export type MountFailure = "error" | "delay";
export type UnmountFailure = "error" | "delay";
export type ContextFailure = "error" | "corrupt";
export type LazyFailure = "error" | "delay" | "timeout";

export type FailureMode =
  | StateFailure
  | EffectFailure
  | AsyncFailure
  | RenderFailure
  | MountFailure
  | UnmountFailure
  | ContextFailure
  | LazyFailure;

export interface ChaosTypeConfig<F extends FailureMode = FailureMode> {
  enabled: boolean;
  probability?: number;
  failures?: F[];
}

export interface TargetPattern {
  type: "component" | "hook" | "file";
  pattern: string | RegExp;
}

export interface ChaosConfig {
  enabled: boolean;
  chaos: {
    defaultProbability: number;
    delayRange: [min: number, max: number];
    seed?: number;
  };
  microscopic: {
    state: ChaosTypeConfig<StateFailure>;
    effect: ChaosTypeConfig<EffectFailure>;
    context: ChaosTypeConfig<ContextFailure>;
    async: ChaosTypeConfig<AsyncFailure>;
  };
  macroscopic: {
    render: ChaosTypeConfig<RenderFailure>;
    mount: ChaosTypeConfig<MountFailure>;
    unmount: ChaosTypeConfig<UnmountFailure>;
    lazy: ChaosTypeConfig<LazyFailure>;
  };
  targeting: {
    include: TargetPattern[];
    exclude: TargetPattern[];
  };
  scheduling: {
    pattern: "continuous" | "burst" | "scheduled";
    burstInterval?: number;
    schedule?: Array<{ start: number; end: number }>;
  };
  logging: {
    enabled: boolean;
    level: "error" | "warn" | "info" | "debug";
    transport?: LogTransport;
  };
  devtools: {
    enabled: boolean;
    showIndicator: boolean;
    hotkey: string;
  };
}

export interface ChaosEvent {
  id: string;
  type: ChaosType;
  failure: FailureMode;
  target: string;
  component?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface LogTransport {
  send(event: ChaosEvent): void;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface HookMetadata {
  name?: string;
  component?: string;
  location?: { line: number; column: number };
}
