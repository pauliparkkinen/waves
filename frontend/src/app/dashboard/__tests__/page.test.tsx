import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

describe("DashboardPage", () => {
  describe("given initial page load", () => {
    it("when rendered, then shows title", () => {
      render(<DashboardPage />);
      expect(screen.getByText("Waves")).toBeInTheDocument();
    });

    it("when rendered, then shows subtitle", () => {
      render(<DashboardPage />);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("when rendered, then shows placeholder message", () => {
      render(<DashboardPage />);
      expect(screen.getByText("Dashboard content coming soon.")).toBeInTheDocument();
    });
  });
});
