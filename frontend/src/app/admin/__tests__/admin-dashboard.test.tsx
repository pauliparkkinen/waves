import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "../page";

// Mock next/link to render simple <a> tags
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("AdminDashboard", () => {
  describe("given initial page load", () => {
    it("when rendered, then shows title", () => {
      render(<AdminDashboard />);
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });

    it("when rendered, then shows all four section cards", () => {
      render(<AdminDashboard />);
      expect(screen.getByText("Collections")).toBeInTheDocument();
      expect(screen.getByText("Forms")).toBeInTheDocument();
      expect(screen.getByText("Questions")).toBeInTheDocument();
      expect(screen.getByText("Sections")).toBeInTheDocument();
    });
  });

  describe("given section cards", () => {
    it("when rendered, then Collections card links to /admin/collections", () => {
      render(<AdminDashboard />);
      const link = screen.getByText("Collections").closest("a");
      expect(link).toHaveAttribute("href", "/admin/collections");
    });

    it("when rendered, then Forms card links to /admin/forms", () => {
      render(<AdminDashboard />);
      const link = screen.getByText("Forms").closest("a");
      expect(link).toHaveAttribute("href", "/admin/forms");
    });

    it("when rendered, then Questions card links to /admin/questions", () => {
      render(<AdminDashboard />);
      const link = screen.getByText("Questions").closest("a");
      expect(link).toHaveAttribute("href", "/admin/questions");
    });

    it("when rendered, then Sections card links to /admin/sections", () => {
      render(<AdminDashboard />);
      const link = screen.getByText("Sections").closest("a");
      expect(link).toHaveAttribute("href", "/admin/sections");
    });
  });
});
