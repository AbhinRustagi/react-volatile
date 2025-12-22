import { useEffect, useMemo, type ReactNode } from "react";
import { ChaosEngine, type DeepPartial, type ChaosConfig } from "@react-volatile/core";
import { VolatileContext } from "./VolatileContext";

interface VolatileProviderProps {
  children: ReactNode;
  config?: DeepPartial<ChaosConfig>;
  disabled?: boolean;
}

export function VolatileProvider({
  children,
  config,
  disabled,
}: VolatileProviderProps) {
  const isDisabled =
    disabled ??
    (typeof process !== "undefined" && process.env?.NODE_ENV === "production");

  const engine = useMemo(() => {
    if (isDisabled) return null;
    return new ChaosEngine(config);
  }, [isDisabled]);

  useEffect(() => {
    if (!engine) return;

    if (config) engine.updateConfig(config);
  }, [config, engine]);

  useEffect(() => {
    if (!engine) return;
    engine.start();
    return () => engine.stop();
  }, [engine]);

  return (
    <VolatileContext.Provider value={engine}>
      {children}
    </VolatileContext.Provider>
  );
}
