import { Component, type ReactNode } from "react";
import { VolatileError } from "@react-volatile/core";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      const isVolatile = VolatileError.isVolatileError(this.state.error);
      return (
        <div
          style={{
            padding: "16px",
            border: `1px solid ${isVolatile ? "#f59e0b" : "#ef4444"}`,
            borderRadius: "8px",
            backgroundColor: isVolatile ? "#fef3c7" : "#fef2f2",
          }}
        >
          <strong>{isVolatile ? "Chaos Error" : "Error"}</strong>
          <p>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
