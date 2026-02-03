import { useVolatileAsync } from "@react-volatile/react";

async function fetchUser() {
  const response = await fetch("https://jsonplaceholder.typicode.com/users/1");
  return response.json();
}

export function AsyncExample() {
  const { data, error, loading, execute } = useVolatileAsync(fetchUser, {
    name: "fetchUser",
    component: "AsyncExample",
    failures: ["delay", "reject"],
  });

  return (
    <div style={{ padding: "16px", border: "1px solid #ddd", borderRadius: "8px" }}>
      <h3>Async Fetch</h3>
      <button onClick={() => execute()} disabled={loading}>
        {loading ? "Loading..." : "Fetch User"}
      </button>
      {error && <p style={{ color: "red" }}>{error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
