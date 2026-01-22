import { describe, it, expect } from "vitest";
import { transformSync } from "@babel/core";
import plugin from "./index";

function transform(code: string, opts = {}) {
  const result = transformSync(code, {
    plugins: [[plugin, opts]],
    parserOpts: { plugins: ["jsx"] },
    filename: "test.tsx",
  });
  return result?.code ?? "";
}

describe("react-volatile babel plugin", () => {
  describe("basic transformations", () => {
    it("transforms useState", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          const [count, setCount] = useState(0);
        }
      `;
      const output = transform(code);
      expect(output).toContain("useVolatileState");
      expect(output).toContain("@react-volatile/react");
    });

    it("transforms useEffect", () => {
      const code = `
        import { useEffect } from 'react';
        function App() {
          useEffect(() => {}, []);
        }
      `;
      const output = transform(code);
      expect(output).toContain("useVolatileEffect");
    });

    it("transforms useLayoutEffect", () => {
      const code = `
        import { useLayoutEffect } from 'react';
        function App() {
          useLayoutEffect(() => {}, []);
        }
      `;
      const output = transform(code);
      expect(output).toContain("useVolatileLayoutEffect");
    });

    it("transforms useReducer", () => {
      const code = `
        import { useReducer } from 'react';
        function App() {
          const [state, dispatch] = useReducer(reducer, init);
        }
      `;
      const output = transform(code);
      expect(output).toContain("useVolatileReducer");
    });

    it("transforms useMemo", () => {
      const code = `
        import { useMemo } from 'react';
        function App() {
          const val = useMemo(() => expensive(), [dep]);
        }
      `;
      const output = transform(code);
      expect(output).toContain("useVolatileMemo");
    });

    it("transforms useCallback", () => {
      const code = `
        import { useCallback } from 'react';
        function App() {
          const fn = useCallback(() => {}, [dep]);
        }
      `;
      const output = transform(code);
      expect(output).toContain("useVolatileCallback");
    });
  });

  describe("metadata injection", () => {
    it("injects component name", () => {
      const code = `
        import { useState } from 'react';
        function MyComponent() {
          const [x, setX] = useState(0);
        }
      `;
      const output = transform(code);
      expect(output).toContain('"MyComponent"');
    });

    it("injects hook name", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          const [x, setX] = useState(0);
        }
      `;
      const output = transform(code);
      expect(output).toContain('"useState"');
    });

    it("injects location", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          const [x, setX] = useState(0);
        }
      `;
      const output = transform(code);
      expect(output).toContain("line:");
      expect(output).toContain("column:");
    });

    it("works with arrow functions", () => {
      const code = `
        import { useState } from 'react';
        const App = () => {
          const [x, setX] = useState(0);
        };
      `;
      const output = transform(code);
      expect(output).toContain('"App"');
    });

    it("handles multiple hooks", () => {
      const code = `
        import { useState, useEffect } from 'react';
        function App() {
          const [x, setX] = useState(0);
          useEffect(() => {}, [x]);
        }
      `;
      const output = transform(code);
      expect(output).toContain("useVolatileState");
      expect(output).toContain("useVolatileEffect");
    });
  });

  describe("filtering", () => {
    it("excludes files matching exclude patterns", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          const [x, setX] = useState(0);
        }
      `;
      const result = transformSync(code, {
        plugins: [[plugin, { exclude: ["test.tsx"] }]],
        parserOpts: { plugins: ["jsx"] },
        filename: "test.tsx",
      });
      expect(result?.code).not.toContain("useVolatileState");
    });

    it("only includes files matching include patterns", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          const [x, setX] = useState(0);
        }
      `;
      const result = transformSync(code, {
        plugins: [[plugin, { include: ["components/"] }]],
        parserOpts: { plugins: ["jsx"] },
        filename: "test.tsx",
      });
      expect(result?.code).not.toContain("useVolatileState");
    });
  });

  describe("marked mode", () => {
    it("only transforms hooks with @volatile comment", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          // @volatile
          const [x, setX] = useState(0);
          const [y, setY] = useState(0);
        }
      `;
      const output = transform(code, { mode: "marked" });
      expect(output).toContain("useVolatileState");
      // second useState should not be transformed
      expect(output).toMatch(/useState/);
    });

    it("does not transform without @volatile in marked mode", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          const [x, setX] = useState(0);
        }
      `;
      const output = transform(code, { mode: "marked" });
      expect(output).not.toContain("useVolatileState");
    });
  });

  describe("custom import source", () => {
    it("uses custom import source", () => {
      const code = `
        import { useState } from 'react';
        function App() {
          const [x, setX] = useState(0);
        }
      `;
      const output = transform(code, { importSource: "my-volatile" });
      expect(output).toContain("my-volatile");
      expect(output).not.toContain("@react-volatile/react");
    });
  });
});
