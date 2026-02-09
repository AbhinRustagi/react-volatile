import {
  VolatileProvider,
  ChaosPanel,
  ChaosIndicator,
} from "@react-volatile/react";
import { Counter } from "./examples/Counter";
import { AsyncExample } from "./examples/AsyncExample";
import { EffectExample } from "./examples/EffectExample";
import { ErrorBoundary } from "./components/ErrorBoundary";

export function App() {
  return (
    <VolatileProvider
      config={{
        chaos: { defaultProbability: 0.3, seed: 42 },
        devtools: { enabled: true },
      }}
    >
      <div style={{ padding: "24px", fontFamily: "system-ui" }}>
        <h1>react-volatile playground</h1>
        <p style={{ opacity: 0.6 }}>
          Press Ctrl+Shift+V to toggle the chaos panel
        </p>

        <div style={{ display: "grid", gap: "24px", maxWidth: "600px" }}>
          <ErrorBoundary>
            <Counter />
          </ErrorBoundary>
          <ErrorBoundary>
            <AsyncExample />
          </ErrorBoundary>
          <ErrorBoundary>
            <EffectExample />
          </ErrorBoundary>
        </div>
      </div>

      <ChaosPanel />
      <ChaosIndicator />
    </VolatileProvider>
  );
}
