import { useState, useEffect, useRef, type ComponentType } from "react";
import { VolatileError } from "@react-volatile/core";
import type { RenderFailure } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

interface WithVolatileOptions {
  probability?: number;
  failures?: RenderFailure[];
}

export function withVolatile<P extends Record<string, unknown>>(
  WrappedComponent: ComponentType<P>,
  options: WithVolatileOptions = {},
) {
  const displayName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";

  function VolatileWrapper(props: P) {
    const engine = useVolatileEngine();
    const [ready, setReady] = useState(true);
    const delayTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
      return () => {
        if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      };
    }, []);

    useEffect(() => {
      if (
        !engine ||
        !engine.shouldTrigger("render", displayName, options.probability)
      ) {
        return;
      }

      const failure = engine.selectFailure(
        "render",
        options.failures ?? ["error", "delay", "empty"],
      );

      engine.emitEvent({
        type: "render",
        failure,
        target: displayName,
        component: displayName,
      });

      switch (failure) {
        case "delay": {
          setReady(false);
          const delay = engine.getDelay();
          delayTimerRef.current = setTimeout(() => setReady(true), delay);
          break;
        }
        case "error":
          throw new VolatileError("render", "error", displayName, displayName);
        case "empty":
          setReady(false);
          break;
      }
    }, [engine]);

    if (!ready) return null;

    return <WrappedComponent {...props} />;
  }

  VolatileWrapper.displayName = `withVolatile(${displayName})`;
  return VolatileWrapper;
}
