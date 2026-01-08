import { useCallback } from "react";
import type { ChaosType, FailureMode } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

interface TriggerOptions {
  type: ChaosType;
  failure: FailureMode;
  target: string;
  component?: string;
}

export function useChaosTrigger() {
  const engine = useVolatileEngine();

  const trigger = useCallback(
    (options: TriggerOptions) => {
      if (!engine) return;

      engine.emitEvent({
        type: options.type,
        failure: options.failure,
        target: options.target,
        component: options.component,
      });
    },
    [engine],
  );

  const isActive = engine?.isRunning() ?? false;

  return { trigger, isActive, engine };
}
