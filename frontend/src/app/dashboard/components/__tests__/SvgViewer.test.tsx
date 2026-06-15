import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SvgViewer, ShapeRenderer } from "../SvgViewer";
import type { SimulatedObject } from "@/lib/api";

const mockCircle: SimulatedObject = {
  shape: { type: "circle", radius: 50 },
  color: "#2563eb",
  position: { x: 100, y: 100, angle: 45 },
};

const mockUnknownShape: SimulatedObject = {
  shape: { type: "hexagon" as "circle", radius: 30 },
  color: "#ff0000",
  position: { x: 200, y: 200, angle: 0 },
};

describe("SvgViewer", () => {
  describe("given an empty objects array", () => {
    it("when rendered, then shows empty state message", () => {
      render(<SvgViewer objects={[]} />);
      expect(screen.getByText("No objects to render.")).toBeInTheDocument();
    });
  });

  describe("given one or more objects", () => {
    it("when rendered, then shows SVG with grid and shapes", () => {
      render(<SvgViewer objects={[mockCircle]} />);
      const svg = document.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg?.querySelector("circle")).toBeInTheDocument();
    });

    it("when rendered, then has accessible aria-label", () => {
      render(<SvgViewer objects={[mockCircle, mockCircle]} />);
      const svg = screen.getByRole("img", { name: /Simulation output: 2 objects/ });
      expect(svg).toBeInTheDocument();
    });
  });
});

describe("ShapeRenderer", () => {
  describe("given a circle object", () => {
    it("when rendered, then draws a circle SVG element", () => {
      const { container } = render(<ShapeRenderer obj={mockCircle} index={0} />);
      const circle = container.querySelector("circle[cx='100'][cy='100']");
      expect(circle).toBeInTheDocument();
      expect(circle?.getAttribute("r")).toBe("50");
    });

    it("when rendered, then shows index label", () => {
      render(
        <svg>
          <ShapeRenderer obj={mockCircle} index={0} />
        </svg>
      );
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("when rendered, then shows direction indicator line", () => {
      const { container } = render(
        <svg>
          <ShapeRenderer obj={mockCircle} index={0} />
        </svg>
      );
      const lines = container.querySelectorAll("line");
      // Should have direction indicator line (grid lines are in parent SvgViewer)
      expect(lines.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("given an unknown shape type", () => {
    it("when rendered, then draws placeholder dashed circle", () => {
      const { container } = render(<ShapeRenderer obj={mockUnknownShape} index={1} />);
      const dashedCircle = container.querySelector("circle[stroke-dasharray]");
      expect(dashedCircle).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });
});
