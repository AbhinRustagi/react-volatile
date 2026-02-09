import { useState, useRef, useEffect, useCallback } from "react";
import { VolatileError } from "@react-volatile/core";
import type { HookMetadata, StateFailure } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

interface UseVolatileStateOptions extends HookMetadata {
  probability?: number;
  failures?: StateFailure[];
  corruptor?: <T>(value: T) => T;
}

export function useVolatileState<T>(
  initialState: T | (() => T),
  options: UseVolatileStateOptions = {},
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const engine = useVolatileEngine();
  const [state, setState] = useState(initialState);
  const [pendingError, setPendingError] = useState<VolatileError | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = options.name ?? "useState";
  const component = options.component;

  // Throw during render so ErrorBoundary can catch it
  if (pendingError) {
    throw pendingError;
  }

  useEffect(() => {
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, []);

  const volatileSetState: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      if (!engine || !engine.shouldTrigger("state", target, options.probability)) {
        setState(action);
        return;
      }

      const failure = engine.selectFailure(
        "state",
        options.failures ?? ["delay", "error", "corrupt"],
      );

      engine.emitEvent({ type: "state", failure, target, component });

      switch (failure) {
        case "delay": {
          const delay = engine.getDelay();
          delayTimerRef.current = setTimeout(() => setState(action), delay);
          break;
        }
        case "error":
          setPendingError(new VolatileError("state", "error", target, component));
          break;
        case "corrupt": {
          const resolvedValue =
            typeof action === "function"
              ? (action as (prev: T) => T)(state)
              : action;
          const corrupted = options.corruptor
            ? options.corruptor(resolvedValue)
            : corruptValue(resolvedValue);
          setState(corrupted as T);
          break;
        }
      }
    },
    [engine, target, component, options.probability, options.failures, state],
  );

  return [state, volatileSetState];
}

function corruptValue(value: unknown): unknown {
  if (typeof value === "number") return value * -1 + Math.random() * 100;
  if (typeof value === "string") return value.split("").reverse().join("");
  if (typeof value === "boolean") return !value;
  if (Array.isArray(value)) return value.slice().reverse();
  if (value && typeof value === "object") return {};
  return value;
}
