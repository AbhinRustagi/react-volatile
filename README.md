# react-volatile

Chaos engineering for React applications. Inject controlled failures into hooks, components, and async operations during development and testing.

## Packages

| Package | Description |
|---------|-------------|
| `@react-volatile/core` | Core chaos engine (framework-agnostic) |
| `@react-volatile/react` | React hooks, provider, and devtools |
| `@react-volatile/babel-plugin` | Automatic hook transformation |

## Installation

```bash
npm install @react-volatile/react
```

```bash
yarn add @react-volatile/react
```

```bash
pnpm add @react-volatile/react
```

The `@react-volatile/core` package is included as a dependency. For the babel plugin:

```bash
npm install -D @react-volatile/babel-plugin
```

## Quick Start

```tsx
import { VolatileProvider, useVolatileState, ChaosPanel } from '@react-volatile/react';

function App() {
  return (
    <VolatileProvider config={{ chaos: { defaultProbability: 0.3 } }}>
      <Counter />
      <ChaosPanel />
    </VolatileProvider>
  );
}

function Counter() {
  const [count, setCount] = useVolatileState(0, {
    name: 'count',
    component: 'Counter',
    failures: ['delay', 'error', 'corrupt'],
  });

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

## Available Hooks

- `useVolatileState` - wraps `useState`
- `useVolatileEffect` / `useVolatileLayoutEffect` - wraps `useEffect` / `useLayoutEffect`
- `useVolatileReducer` - wraps `useReducer`
- `useVolatileMemo` - wraps `useMemo`
- `useVolatileCallback` - wraps `useCallback`
- `useVolatileAsync` - wraps async functions with loading/error state
- `useChaosTrigger` - manual chaos control

## Babel Plugin

Automatically transform React hooks to volatile equivalents:

```json
{
  "plugins": [["@react-volatile/babel-plugin", { "mode": "all" }]]
}
```

## License

MIT
