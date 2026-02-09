import { useReducer, useRef, useEffect, useCallback } from "react";
import { VolatileError } from "@react-volatile/core";
import type { HookMetadata, StateFailure } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

interface UseVolatileReducerOptions extends HookMetadata {
  probability?: number;
  failures?: StateFailure[];
}

export function useVolatileReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  options: UseVolatileReducerOptions = {},
): [S, (action: A) => void] {
  const engine = useVolatileEngine();
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const target = options.name ?? "useReducer";

  stateRef.current = state;

  useEffect(() => {
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    };
  }, []);

  const volatileDispatch = useCallback(
    (action: A) => {
      if (!engine || !engine.shouldTrigger("state", target, options.probability)) {
        dispatch(action);
        return;
      }

      const failure = engine.selectFailure(
        "state",
        options.failures ?? ["delay", "error"],
      );

      engine.emitEvent({
        type: "state",
        failure,
        target,
        component: options.component,
      });

      switch (failure) {
        case "delay": {
          const delay = engine.getDelay();
          delayTimerRef.current = setTimeout(() => dispatch(action), delay);
          break;
        }
        case "error":
          throw new VolatileError("state", "error", target, options.component);
        default:
          dispatch(action);
      }
    },
    [engine, target, options.probability, options.failures, options.component],
  );

  return [state, volatileDispatch];
}
