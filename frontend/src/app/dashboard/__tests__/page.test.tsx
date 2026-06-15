import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

describe("DashboardPage", () => {
  describe("given initial page load (no results)", () => {
    it("when rendered, then shows title", () => {
      render(<DashboardPage />);
      expect(screen.getByText("Waves")).toBeInTheDocument();
    });

    it("when rendered, then shows subtitle", () => {
      render(<DashboardPage />);
      expect(screen.getByText("Markov-chain simulation visualizer")).toBeInTheDocument();
    });

    it("when rendered, then shows configuration panel", () => {
      render(<DashboardPage />);
      expect(screen.getByText("Configuration")).toBeInTheDocument();
    });

    it("when rendered, then shows Simulate button", () => {
      render(<DashboardPage />);
      expect(screen.getByRole("button", { name: /simulate/i })).toBeInTheDocument();
    });

    it("when rendered with no results, then shows empty state prompt", () => {
      render(<DashboardPage />);
      expect(screen.getByText(/Configure parameters/i)).toBeInTheDocument();
    });
  });

  describe("given no results and not loading", () => {
    it("when rendered, then does not show SVG viewer", () => {
      render(<DashboardPage />);
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });
});

/*
 * Note: Error and results states are tested via SimulationConfigPanel component tests
 * and would be covered by E2E / integration tests with a running backend.
 */
