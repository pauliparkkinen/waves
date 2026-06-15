import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSimulation, type SimulationInput } from "../api";

const mockInput: SimulationInput = {
  shape: { type: "circle", radius: 42 },
  color: "#FF0000",
  position: { x: 10, y: 20, angle: 45 },
  rules: [],
};

describe("runSimulation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("given a successful API response", () => {
    it("when called with valid input, then returns SimulationOutput", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              {
                shape: { type: "circle", radius: 42 },
                color: "#FF0000",
                position: { x: 10, y: 20, angle: 45 },
              },
            ],
          }),
      } as Response);

      const result = await runSimulation(mockInput);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].shape.type).toBe("circle");
      expect(result.results[0].color).toBe("#FF0000");
    });

    it("when called with access token, then sends Bearer header", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      } as Response);

      await runSimulation(mockInput, "test-token");

      const callArgs = fetchSpy.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer test-token");
    });
  });

  describe("given a failed API response", () => {
    it("when server returns error, then throws with error message", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: "Simulator crashed" }),
      } as Response);

      await expect(runSimulation(mockInput)).rejects.toThrow("Simulator crashed");
    });

    it("when server returns non-JSON error, then throws default message", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Not JSON")),
      } as Response);

      await expect(runSimulation(mockInput)).rejects.toThrow("Simulation failed (500)");
    });
  });
});
