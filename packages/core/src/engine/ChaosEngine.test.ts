import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChaosEngine } from "./ChaosEngine";

describe("ChaosEngine", () => {
  let engine: ChaosEngine;

  beforeEach(() => {
    engine = new ChaosEngine({
      chaos: { seed: 42, defaultProbability: 1.0 },
    });
    engine.start();
  });

  describe("shouldTrigger", () => {
    it("triggers when probability is 1", () => {
      expect(engine.shouldTrigger("state", "test")).toBe(true);
    });

    it("never triggers when probability is 0", () => {
      engine.updateConfig({ chaos: { defaultProbability: 0 } });
      for (let i = 0; i < 100; i++) {
        expect(engine.shouldTrigger("state", "test")).toBe(false);
      }
    });

    it("never triggers when disabled", () => {
      engine.updateConfig({ enabled: false });
      expect(engine.shouldTrigger("state", "test")).toBe(false);
    });

    it("never triggers when stopped", () => {
      engine.stop();
      expect(engine.shouldTrigger("state", "test")).toBe(false);
    });

    it("never triggers when type is disabled", () => {
      engine.updateConfig({ microscopic: { state: { enabled: false } } });
      expect(engine.shouldTrigger("state", "test")).toBe(false);
    });

    it("respects override probability", () => {
      expect(engine.shouldTrigger("state", "test", 0)).toBe(false);
    });

    it("produces consistent results with same seed", () => {
      const engine1 = new ChaosEngine({
        chaos: { seed: 123, defaultProbability: 0.5 },
      });
      const engine2 = new ChaosEngine({
        chaos: { seed: 123, defaultProbability: 0.5 },
      });
      engine1.start();
      engine2.start();

      const results1 = Array.from({ length: 20 }, () =>
        engine1.shouldTrigger("state", "test"),
      );
      const results2 = Array.from({ length: 20 }, () =>
        engine2.shouldTrigger("state", "test"),
      );

      expect(results1).toEqual(results2);
    });
  });

  describe("targeting", () => {
    it("excludes matching targets", () => {
      engine.updateConfig({
        targeting: {
          exclude: [{ type: "component", pattern: "Header" }],
        },
      });
      expect(engine.shouldTrigger("state", "Header")).toBe(false);
      expect(engine.shouldTrigger("state", "Footer")).toBe(true);
    });

    it("includes only matching targets", () => {
      engine.updateConfig({
        targeting: {
          include: [{ type: "component", pattern: "Counter" }],
        },
      });
      expect(engine.shouldTrigger("state", "Counter")).toBe(true);
      expect(engine.shouldTrigger("state", "Header")).toBe(false);
    });

    it("supports regex patterns", () => {
      engine.updateConfig({
        targeting: {
          include: [{ type: "component", pattern: /^Auth/ }],
        },
      });
      expect(engine.shouldTrigger("state", "AuthForm")).toBe(true);
      expect(engine.shouldTrigger("state", "LoginForm")).toBe(false);
    });

    it("exclude takes priority over include", () => {
      engine.updateConfig({
        targeting: {
          include: [{ type: "component", pattern: "Auth" }],
          exclude: [{ type: "component", pattern: "AuthDebug" }],
        },
      });
      expect(engine.shouldTrigger("state", "AuthForm")).toBe(true);
      expect(engine.shouldTrigger("state", "AuthDebug")).toBe(false);
    });
  });

  describe("selectFailure", () => {
    it("selects from configured failures", () => {
      engine.updateConfig({
        microscopic: { state: { enabled: true, failures: ["delay", "error"] } },
      });
      const failure = engine.selectFailure("state");
      expect(["delay", "error"]).toContain(failure);
    });

    it("selects from override failures", () => {
      const failure = engine.selectFailure("state", ["corrupt"]);
      expect(failure).toBe("corrupt");
    });

    it("throws when no failures are configured", () => {
      engine.updateConfig({
        microscopic: { state: { enabled: true, failures: [] } },
      });
      expect(() => engine.selectFailure("state")).toThrow();
    });
  });

  describe("events", () => {
    it("emits events to subscribers", () => {
      const handler = vi.fn();
      engine.subscribe(handler);

      engine.emitEvent({ type: "state", failure: "error", target: "test" });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "state",
          failure: "error",
          target: "test",
          id: expect.stringMatching(/^chaos-/),
          timestamp: expect.any(Number),
        }),
      );
    });

    it("supports unsubscription", () => {
      const handler = vi.fn();
      const unsubscribe = engine.subscribe(handler);
      unsubscribe();

      engine.emitEvent({ type: "state", failure: "error", target: "test" });

      expect(handler).not.toHaveBeenCalled();
    });

    it("tracks event history", () => {
      engine.emitEvent({ type: "state", failure: "error", target: "test" });
      engine.emitEvent({ type: "effect", failure: "skip", target: "test" });

      const history = engine.getEventHistory();
      expect(history).toHaveLength(2);
    });

    it("clears history", () => {
      engine.emitEvent({ type: "state", failure: "error", target: "test" });
      engine.clearHistory();
      expect(engine.getEventHistory()).toHaveLength(0);
    });

    it("does not break on subscriber errors", () => {
      engine.subscribe(() => {
        throw new Error("boom");
      });
      const handler = vi.fn();
      engine.subscribe(handler);

      engine.emitEvent({ type: "state", failure: "error", target: "test" });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("config", () => {
    it("returns delay in configured range", () => {
      engine.updateConfig({ chaos: { delayRange: [100, 200] } });
      for (let i = 0; i < 50; i++) {
        const delay = engine.getDelay();
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThanOrEqual(200);
      }
    });

    it("exposes seed", () => {
      const seeded = new ChaosEngine({ chaos: { seed: 999 } });
      expect(seeded.getSeed()).toBe(999);
    });

    it("updates config immutably", () => {
      const before = engine.getConfig();
      engine.updateConfig({ enabled: false });
      expect(engine.getConfig().enabled).toBe(false);
      expect(before.enabled).toBe(true);
    });
  });
});
