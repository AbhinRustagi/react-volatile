import { useState } from "react";
import { useVolatileEffect } from "@react-volatile/react";

export function EffectExample() {
  const [ticks, setTicks] = useState(0);
  const [running, setRunning] = useState(false);

  useVolatileEffect(
    () => {
      if (!running) return;
      const interval = setInterval(() => setTicks((t) => t + 1), 1000);
      return () => clearInterval(interval);
    },
    [running],
    {
      name: "ticker",
      component: "EffectExample",
      failures: ["delay", "skip"],
    },
  );

  return (
    <div style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>Effect Timer</h3>
      <p>Ticks: {ticks}</p>
      <button onClick={() => setRunning(!running)}>
        {running ? "Stop" : "Start"}
      </button>
    </div>
  );
}
