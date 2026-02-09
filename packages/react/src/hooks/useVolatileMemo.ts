import { useMemo } from "react";
import { VolatileError } from "@react-volatile/core";
import type { HookMetadata } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

interface UseVolatileMemoOptions extends HookMetadata {
  probability?: number;
  failures?: ("error")[];
}

export function useVolatileMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options: UseVolatileMemoOptions = {},
): T {
  const engine = useVolatileEngine();
  const target = options.name ?? "useMemo";

  return useMemo(() => {
    if (!engine || !engine.shouldTrigger("state", target, options.probability)) {
      return factory();
    }

    const failure = engine.selectFailure("state", options.failures);

    engine.emitEvent({
      type: "state",
      failure,
      target,
      component: options.component,
    });

    if (failure === "error") {
      throw new VolatileError("state", "error", target, options.component);
    }

    return factory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
