import { useState, useEffect, useRef } from "react";
import { useVolatileEngine } from "../provider/VolatileContext";

interface ChaosIndicatorProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const positionStyles: Record<string, React.CSSProperties> = {
  "top-left": { top: "12px", left: "12px" },
  "top-right": { top: "12px", right: "12px" },
  "bottom-left": { bottom: "12px", left: "12px" },
  "bottom-right": { bottom: "12px", right: "12px" },
};

export function ChaosIndicator({ position = "bottom-left" }: ChaosIndicatorProps) {
  const engine = useVolatileEngine();
  const [count, setCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!engine) return;
    return engine.subscribe(() => {
      setCount((c) => c + 1);
      setPulse(true);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = setTimeout(() => setPulse(false), 300);
    });
  }, [engine]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  if (!engine) return null;

  return (
    <div
      style={{
        position: "fixed",
        ...positionStyles[position],
        zIndex: 99998,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "12px",
        backgroundColor: pulse ? "#7c3aed" : "#1a1a2e",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontSize: "11px",
        transition: "background-color 0.2s",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: engine.isRunning() ? "#10b981" : "#ef4444",
          display: "inline-block",
        }}
      />
      <span>{count}</span>
    </div>
  );
}
