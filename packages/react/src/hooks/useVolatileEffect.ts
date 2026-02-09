import { useEffect, useLayoutEffect, useRef } from "react";
import { VolatileError } from "@react-volatile/core";
import type { HookMetadata, EffectFailure } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

interface UseVolatileEffectOptions extends HookMetadata {
  probability?: number;
  failures?: EffectFailure[];
}

type EffectCallback = () => void | (() => void);

function createVolatileEffectHook(useEffectHook: typeof useEffect) {
  return function useVolatileEffectImpl(
    effect: EffectCallback,
    deps: React.DependencyList | undefined,
    options: UseVolatileEffectOptions = {},
  ): void {
    const engine = useVolatileEngine();
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const cleanupRef = useRef<(() => void) | void>(undefined);

    useEffectHook(() => {
      if (!engine || !engine.shouldTrigger("effect", options.name ?? "useEffect", options.probability)) {
        const cleanup = effect();
        return () => {
          if (typeof cleanup === "function") cleanup();
        };
      }

      const failure = engine.selectFailure(
        "effect",
        options.failures ?? ["delay", "error", "skip"],
      );

      engine.emitEvent({
        type: "effect",
        failure,
        target: options.name ?? "useEffect",
        component: options.component,
      });

      switch (failure) {
        case "skip":
          return;

        case "delay": {
          const delay = engine.getDelay();
          delayTimerRef.current = setTimeout(() => {
            cleanupRef.current = effect();
          }, delay);
          return () => {
            if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
            if (typeof cleanupRef.current === "function") cleanupRef.current();
          };
        }

        case "error":
          throw new VolatileError(
            "effect",
            "error",
            options.name ?? "useEffect",
            options.component,
          );

        default: {
          const cleanup = effect();
          return () => {
            if (typeof cleanup === "function") cleanup();
          };
        }
      }
    }, deps);
  };
}

export const useVolatileEffect = createVolatileEffectHook(useEffect);
export const useVolatileLayoutEffect = createVolatileEffectHook(useLayoutEffect);
