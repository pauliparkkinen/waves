import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimulationConfigPanel } from "../SimulationConfigPanel";
import type { SimulationInput, SimulatedObject } from "@/lib/api";

const defaultInput: SimulationInput = {
  shape: { type: "circle", radius: 50 },
  color: "#2563eb",
  position: { x: 100, y: 100, angle: 0 },
  rules: [],
};

function renderPanel(overrides: Partial<{
  input: SimulationInput;
  loading: boolean;
}> = {}) {
  const onChange = vi.fn();
  const onLoadingChange = vi.fn();
  const onError = vi.fn();
  const onResults = vi.fn();

  render(
    <SimulationConfigPanel
      input={overrides.input ?? defaultInput}
      onChange={onChange}
      loading={overrides.loading ?? false}
      onLoadingChange={onLoadingChange}
      onError={onError}
      onResults={onResults}
    />
  );

  return { onChange, onLoadingChange, onError, onResults };
}

describe("SimulationConfigPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  describe("given the default configuration", () => {
    it("when rendered, then shows shape radio with Circle selected", () => {
      renderPanel();
      const radio = screen.getByLabelText("Circle") as HTMLInputElement;
      expect(radio.checked).toBe(true);
    });

    it("when rendered, then shows radius input with default value", () => {
      renderPanel();
      const radiusInput = screen.getByDisplayValue("50");
      expect(radiusInput).toBeInTheDocument();
    });

    it("when rendered, then shows color input with default value", () => {
      renderPanel();
      const colorInput = screen.getByDisplayValue("#2563eb");
      expect(colorInput).toBeInTheDocument();
    });

    it("when rendered, then shows Simulate button", () => {
      renderPanel();
      expect(screen.getByRole("button", { name: /simulate/i })).toBeInTheDocument();
    });

    it("when rendered, then shows position inputs", () => {
      renderPanel();
      const positionInputs = screen.getAllByDisplayValue("100");
      expect(positionInputs.length).toBeGreaterThanOrEqual(2);
    });

    it("when rendered, then shows rules placeholder", () => {
      renderPanel();
      expect(screen.getByText(/Rules support coming/i)).toBeInTheDocument();
    });
  });

  describe("given loading is true", () => {
    it("when rendered, then button is disabled and shows simulating text", () => {
      renderPanel({ loading: true });
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(screen.getByText(/Simulating/i)).toBeInTheDocument();
    });
  });

  describe("given invalid color input", () => {
    it("when clicking simulate, then shows validation error", async () => {
      renderPanel({ input: { ...defaultInput, color: "invalid" } });
      fireEvent.click(screen.getByRole("button", { name: /simulate/i }));
      expect(await screen.findByText(/valid hex code/i)).toBeInTheDocument();
    });
  });

  describe("given invalid radius", () => {
    it("when clicking simulate, then shows validation error", async () => {
      renderPanel({
        input: {
          ...defaultInput,
          shape: { type: "circle", radius: 0 },
        },
      });
      fireEvent.click(screen.getByRole("button", { name: /simulate/i }));
      expect(await screen.findByText(/Radius must be greater than 0/i)).toBeInTheDocument();
    });
  });

  describe("given valid input", () => {
    it("when clicking simulate, then calls fetch and returns results", async () => {
      const mockResults: SimulatedObject[] = [
        { shape: { type: "circle", radius: 50 }, color: "#2563eb", position: { x: 100, y: 100, angle: 0 } },
      ];
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: mockResults }),
      });
      globalThis.fetch = fetchMock;
      const { onResults, onLoadingChange } = renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /simulate/i }));

      expect(onLoadingChange).toHaveBeenCalledWith(true);
      await vi.waitFor(() => {
        expect(onResults).toHaveBeenCalledWith(mockResults);
      });
    });

    it("when simulation fails, then calls onError", async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "Backend error" }),
      });
      globalThis.fetch = fetchMock;
      const { onError, onLoadingChange } = renderPanel();

      fireEvent.click(screen.getByRole("button", { name: /simulate/i }));

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith("Backend error");
      });
    });
  });

  describe("given shape type changes", () => {
    it("when Circle radio is already selected, then clicking it does not trigger onChange", () => {
      const { onChange } = renderPanel({
        input: { ...defaultInput, shape: { type: "circle", radius: 50 } },
      });
      const radio = screen.getByLabelText("Circle") as HTMLInputElement;
      expect(radio.checked).toBe(true);
      fireEvent.click(radio);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("given color changes", () => {
    it("when typing a new color, then calls onChange", () => {
      const { onChange } = renderPanel();
      const colorInput = screen.getByDisplayValue("#2563eb");
      fireEvent.change(colorInput, { target: { value: "#FF0000" } });
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ color: "#FF0000" })
      );
    });
  });
});
