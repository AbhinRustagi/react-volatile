import type { PluginObj, NodePath } from "@babel/core";
import type * as t from "@babel/types";

interface PluginOptions {
  mode?: "all" | "marked";
  include?: string[];
  exclude?: string[];
  importSource?: string;
}

const HOOK_MAP: Record<string, string> = {
  useState: "useVolatileState",
  useEffect: "useVolatileEffect",
  useLayoutEffect: "useVolatileLayoutEffect",
  useReducer: "useVolatileReducer",
  useMemo: "useVolatileMemo",
  useCallback: "useVolatileCallback",
};

// Hooks where metadata is injected as the last argument
const METADATA_POSITION: Record<string, "last" | "second"> = {
  useState: "second",
  useEffect: "last",
  useLayoutEffect: "last",
  useReducer: "last",
  useMemo: "last",
  useCallback: "last",
};

export default function reactVolatilePlugin({
  types: t,
}: {
  types: typeof import("@babel/types");
}): PluginObj {
  return {
    name: "react-volatile",
    visitor: {
      Program: {
        enter(path, state) {
          const opts = state.opts as PluginOptions;
          const filename = state.filename ?? "";

          if (opts.exclude?.some((p) => filename.includes(p))) {
            (state as Record<string, unknown>).__skip = true;
            return;
          }
          if (
            opts.include &&
            opts.include.length > 0 &&
            !opts.include.some((p) => filename.includes(p))
          ) {
            (state as Record<string, unknown>).__skip = true;
            return;
          }

          (state as Record<string, unknown>).__volatileImported = false;
          (state as Record<string, unknown>).__usedVolatileHooks = new Set<string>();
        },
        exit(path, state) {
          if ((state as Record<string, unknown>).__skip) return;
          const used = (state as Record<string, unknown>).__usedVolatileHooks as Set<string>;
          if (!used || used.size === 0) return;

          const opts = state.opts as PluginOptions;
          const importSource = opts.importSource ?? "@react-volatile/react";

          const specifiers = Array.from(used).map((name) =>
            t.importSpecifier(t.identifier(name), t.identifier(name)),
          );

          const importDecl = t.importDeclaration(
            specifiers,
            t.stringLiteral(importSource),
          );

          path.unshiftContainer("body", importDecl);
        },
      },

      CallExpression(path, state) {
        if ((state as Record<string, unknown>).__skip) return;

        const opts = state.opts as PluginOptions;
        const callee = path.node.callee;
        if (!t.isIdentifier(callee)) return;

        const hookName = callee.name;
        const volatileHook = HOOK_MAP[hookName];
        if (!volatileHook) return;

        if (opts.mode === "marked") {
          const hasMarker = hasVolatileComment(path);
          if (!hasMarker) return;
        }

        const componentName = getEnclosingComponentName(path, t);
        const loc = path.node.loc?.start;

        const metadata = t.objectExpression([
          ...(componentName
            ? [
                t.objectProperty(
                  t.identifier("component"),
                  t.stringLiteral(componentName),
                ),
              ]
            : []),
          ...(hookName
            ? [
                t.objectProperty(
                  t.identifier("name"),
                  t.stringLiteral(hookName),
                ),
              ]
            : []),
          ...(loc
            ? [
                t.objectProperty(
                  t.identifier("location"),
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier("line"),
                      t.numericLiteral(loc.line),
                    ),
                    t.objectProperty(
                      t.identifier("column"),
                      t.numericLiteral(loc.column),
                    ),
                  ]),
                ),
              ]
            : []),
        ]);

        const position = METADATA_POSITION[hookName] ?? "last";
        if (position === "second") {
          path.node.arguments.splice(1, 0, metadata);
        } else {
          path.node.arguments.push(metadata);
        }

        callee.name = volatileHook;
        const used = (state as Record<string, unknown>).__usedVolatileHooks as Set<string>;
        used.add(volatileHook);
      },
    },
  };
}

function hasVolatileComment(path: NodePath<t.CallExpression>): boolean {
  const statement = path.getStatementParent();
  if (!statement) return false;
  const comments = statement.node.leadingComments;
  return comments?.some((c) => c.value.includes("@volatile")) ?? false;
}

function getEnclosingComponentName(
  path: NodePath,
  t: typeof import("@babel/types"),
): string | null {
  let current: NodePath | null = path;
  while (current) {
    if (t.isFunctionDeclaration(current.node) && current.node.id) {
      return current.node.id.name;
    }
    if (t.isVariableDeclarator(current.node) && t.isIdentifier(current.node.id)) {
      return current.node.id.name;
    }
    current = current.parentPath;
  }
  return null;
}
