import { createContext, useContext } from "react";
import type { ChaosEngine } from "@react-volatile/core";

export const VolatileContext = createContext<ChaosEngine | null>(null);

export function useVolatileEngine(): ChaosEngine | null {
  return useContext(VolatileContext);
}
