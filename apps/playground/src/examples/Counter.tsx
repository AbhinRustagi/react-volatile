import { useVolatileState } from "@react-volatile/react";

export function Counter() {
  const [count, setCount] = useVolatileState(0, {
    name: "count",
    component: "Counter",
    failures: ["delay", "error", "corrupt"],
  });

  return (
    <div style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>Counter</h3>
      <p>Count: {count}</p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={() => setCount((c) => c + 1)}>+1</button>
        <button onClick={() => setCount((c) => c - 1)}>-1</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
    </div>
  );
}
