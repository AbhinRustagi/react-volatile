import { useState, useCallback, useRef, useEffect } from "react";
import { VolatileError } from "@react-volatile/core";
import type { HookMetadata, AsyncFailure } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

interface UseVolatileAsyncOptions extends HookMetadata {
  probability?: number;
  failures?: AsyncFailure[];
}

export function useVolatileAsync<T>(
  asyncFn: (...args: unknown[]) => Promise<T>,
  options: UseVolatileAsyncOptions = {},
): AsyncState<T> & { execute: (...args: unknown[]) => Promise<T | null> } {
  const engine = useVolatileEngine();
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: false,
  });
  const mountedRef = useRef(true);
  const target = options.name ?? "useAsync";

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | null> => {
      setState({ data: null, error: null, loading: true });

      try {
        if (
          engine &&
          engine.shouldTrigger("async", target, options.probability)
        ) {
          const failure = engine.selectFailure(
            "async",
            options.failures ?? ["delay", "reject", "timeout"],
          );

          engine.emitEvent({
            type: "async",
            failure,
            target,
            component: options.component,
          });

          switch (failure) {
            case "delay": {
              const delay = engine.getDelay();
              await new Promise((r) => setTimeout(r, delay));
              break;
            }
            case "reject":
              throw new VolatileError(
                "async",
                "reject",
                target,
                options.component,
              );
            case "timeout": {
              const timeout = engine.getDelay() * 3;
              await new Promise((r) => setTimeout(r, timeout));
              throw new VolatileError(
                "async",
                "timeout",
                target,
                options.component,
              );
            }
          }
        }

        const result = await asyncFn(...args);
        if (mountedRef.current) {
          setState({ data: result, error: null, loading: false });
        }
        return result;
      } catch (error) {
        if (mountedRef.current) {
          setState({
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
          });
        }
        return null;
      }
    },
    [engine, asyncFn, target, options.probability, options.failures, options.component],
  );

  return { ...state, execute };
}
