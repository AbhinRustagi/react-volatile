import { useState, useEffect, useCallback, useRef } from "react";
import type { ChaosEvent, ChaosType } from "@react-volatile/core";
import { useVolatileEngine } from "../provider/VolatileContext";

const TYPE_COLORS: Record<ChaosType, string> = {
  state: "#f59e0b",
  effect: "#3b82f6",
  context: "#8b5cf6",
  async: "#ef4444",
  render: "#10b981",
  mount: "#06b6d4",
  unmount: "#ec4899",
  lazy: "#6366f1",
};

const panelStyles = {
  container: {
    position: "fixed" as const,
    bottom: "16px",
    right: "16px",
    width: "400px",
    maxHeight: "500px",
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    borderRadius: "8px",
    fontFamily: "monospace",
    fontSize: "12px",
    zIndex: 99999,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  header: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "8px 12px",
    backgroundColor: "#16213e",
    borderBottom: "1px solid #333",
    cursor: "pointer" as const,
  },
  title: {
    fontWeight: "bold" as const,
    fontSize: "13px",
  },
  body: {
    maxHeight: "400px",
    overflowY: "auto" as const,
    padding: "8px",
  },
  event: {
    padding: "6px 8px",
    marginBottom: "4px",
    borderRadius: "4px",
    backgroundColor: "#16213e",
    borderLeft: "3px solid",
  },
  badge: {
    display: "inline-block" as const,
    padding: "1px 6px",
    borderRadius: "3px",
    fontSize: "10px",
    fontWeight: "bold" as const,
    marginRight: "6px",
  },
  seedDisplay: {
    fontSize: "10px",
    opacity: 0.6,
  },
  clearButton: {
    background: "none",
    border: "1px solid #555",
    color: "#aaa",
    borderRadius: "4px",
    padding: "2px 8px",
    cursor: "pointer" as const,
    fontSize: "10px",
    marginLeft: "8px",
  },
};

export function ChaosPanel() {
  const engine = useVolatileEngine();
  const [events, setEvents] = useState<ChaosEvent[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<ChaosType | "all">("all");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!engine) return;
    return engine.subscribe((event) => {
      setEvents((prev) => [...prev.slice(-99), event]);
    });
  }, [engine]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [events]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "V") {
        setExpanded((prev) => !prev);
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!engine) return null;

  const filtered =
    filter === "all" ? events : events.filter((e) => e.type === filter);

  return (
    <div style={panelStyles.container}>
      <div
        style={panelStyles.header}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={panelStyles.title}>
          Volatile ({events.length})
        </span>
        <span style={panelStyles.seedDisplay}>
          seed: {engine.getSeed()}
        </span>
      </div>

      {expanded && (
        <>
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #333", display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {(["all", "state", "effect", "async", "render", "context", "mount", "unmount", "lazy"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  ...panelStyles.clearButton,
                  borderColor: filter === t ? "#7c3aed" : "#555",
                  color: filter === t ? "#fff" : "#aaa",
                }}
              >
                {t}
              </button>
            ))}
            <button
              style={panelStyles.clearButton}
              onClick={() => setEvents([])}
            >
              clear
            </button>
          </div>
          <div ref={bodyRef} style={panelStyles.body}>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", opacity: 0.5, padding: "20px" }}>
                No chaos events yet
              </div>
            )}
            {filtered.map((event) => (
              <div
                key={event.id}
                style={{
                  ...panelStyles.event,
                  borderLeftColor: TYPE_COLORS[event.type] ?? "#666",
                }}
              >
                <span
                  style={{
                    ...panelStyles.badge,
                    backgroundColor: TYPE_COLORS[event.type] ?? "#666",
                    color: "#fff",
                  }}
                >
                  {event.type}
                </span>
                <span style={{ opacity: 0.8 }}>{event.failure}</span>
                <span style={{ opacity: 0.5, marginLeft: "8px" }}>
                  {event.target}
                  {event.component ? ` in <${event.component}>` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
