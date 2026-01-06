import { useCallback, useRef, useEffect } from "react";
import { VolatileError } from "@react-volatile/core";
import type { HookMetadata } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

type CallbackFailure = "error" | "delay" | "noop";

interface UseVolatileCallbackOptions extends HookMetadata {
  probability?: number;
  failures?: CallbackFailure[];
}

export function useVolatileCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList,
  options: UseVolatileCallbackOptions = {},
): T {
  const engine = useVolatileEngine();
  const target = options.name ?? "useCallback";
  const pendingTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    return () => {
      for (const timer of pendingTimers.current) clearTimeout(timer);
      pendingTimers.current.clear();
    };
  }, []);

  return useCallback(
    ((...args: unknown[]) => {
      if (
        !engine ||
        !engine.shouldTrigger("state", target, options.probability)
      ) {
        return callback(...args);
      }

      const failure = engine.selectFailure(
        "state",
        options.failures ?? ["error", "delay", "noop"],
      );

      engine.emitEvent({
        type: "state",
        failure,
        target,
        component: options.component,
      });

      switch (failure) {
        case "error":
          throw new VolatileError("state", "error", target, options.component);
        case "delay": {
          const delay = engine.getDelay();
          return new Promise((resolve) => {
            const timer = setTimeout(() => {
              pendingTimers.current.delete(timer);
              resolve(callback(...args));
            }, delay);
            pendingTimers.current.add(timer);
          });
        }
        case "noop":
          return undefined;
        default:
          return callback(...args);
      }
    }) as T,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
}
