import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, screen } from "@testing-library/react";
import { VolatileProvider } from "../provider/VolatileProvider";
import { useVolatileState } from "./useVolatileState";

function TestCounter({ probability = 1.0 }: { probability?: number }) {
  const [count, setCount] = useVolatileState(0, {
    name: "count",
    component: "TestCounter",
    probability,
    failures: ["delay"],
  });
  return (
    <div>
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>increment</button>
    </div>
  );
}

function renderWithProvider(ui: React.ReactElement, seed = 42) {
  return render(
    <VolatileProvider
      config={{
        chaos: { seed, defaultProbability: 1.0 },
        microscopic: {
          state: { enabled: true, failures: ["delay", "error", "corrupt"] },
        },
      }}
    >
      {ui}
    </VolatileProvider>,
  );
}

describe("useVolatileState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("works normally without provider", () => {
    function Bare() {
      const [val, setVal] = useVolatileState(0);
      return <button onClick={() => setVal(1)}>{val}</button>;
    }
    render(<Bare />);
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button")).toHaveTextContent("1");
  });

  it("works normally when disabled", () => {
    function Bare() {
      const [val, setVal] = useVolatileState(0);
      return <button onClick={() => setVal(1)}>{val}</button>;
    }
    render(
      <VolatileProvider disabled>
        <Bare />
      </VolatileProvider>,
    );
    act(() => screen.getByRole("button").click());
    expect(screen.getByRole("button")).toHaveTextContent("1");
  });

  it("delays state updates when delay failure is triggered", () => {
    renderWithProvider(<TestCounter />);
    act(() => screen.getByText("increment").click());

    // state should not have updated yet
    expect(screen.getByTestId("count")).toHaveTextContent("0");

    // advance past delay
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("never triggers with probability 0", () => {
    renderWithProvider(<TestCounter probability={0} />);
    act(() => screen.getByText("increment").click());
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("throws on error failure", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    function ErrorCounter() {
      const [count, setCount] = useVolatileState(0, {
        name: "count",
        component: "ErrorCounter",
        failures: ["error"],
      });
      return <button onClick={() => setCount(count + 1)}>{count}</button>;
    }

    class ErrorBoundary extends React.Component<
      { children: React.ReactNode },
      { error: boolean }
    > {
      state = { error: false };
      static getDerivedStateFromError() {
        return { error: true };
      }
      render() {
        return this.state.error ? (
          <span data-testid="error">caught</span>
        ) : (
          this.props.children
        );
      }
    }

    renderWithProvider(
      <ErrorBoundary>
        <ErrorCounter />
      </ErrorBoundary>,
    );

    act(() => screen.getByRole("button").click());
    expect(screen.getByTestId("error")).toHaveTextContent("caught");

    consoleSpy.mockRestore();
  });

  it("corrupts values with corrupt failure", () => {
    function CorruptCounter() {
      const [count, setCount] = useVolatileState(5, {
        name: "count",
        component: "CorruptCounter",
        failures: ["corrupt"],
      });
      return (
        <div>
          <span data-testid="count">{count}</span>
          <button onClick={() => setCount(10)}>set</button>
        </div>
      );
    }

    renderWithProvider(<CorruptCounter />);
    act(() => screen.getByText("set").click());

    const value = Number(screen.getByTestId("count").textContent);
    expect(value).not.toBe(10);
  });

  it("supports custom corruptor", () => {
    function CustomCorrupt() {
      const [val, setVal] = useVolatileState("hello", {
        name: "val",
        failures: ["corrupt"],
        corruptor: () => "CORRUPTED",
      });
      return (
        <div>
          <span data-testid="val">{val}</span>
          <button onClick={() => setVal("world")}>set</button>
        </div>
      );
    }

    renderWithProvider(<CustomCorrupt />);
    act(() => screen.getByText("set").click());
    expect(screen.getByTestId("val")).toHaveTextContent("CORRUPTED");
  });
});
