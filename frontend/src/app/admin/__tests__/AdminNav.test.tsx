import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminNav from "../components/AdminNav";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

// Mock next/link to render simple <a> tags
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("AdminNav", () => {
  describe("given any route", () => {
    it("when rendered, then shows all nav links", () => {
      vi.mocked(usePathname).mockReturnValue("/admin");
      render(<AdminNav />);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Collections")).toBeInTheDocument();
      expect(screen.getByText("Forms")).toBeInTheDocument();
      expect(screen.getByText("Questions")).toBeInTheDocument();
      expect(screen.getByText("Sections")).toBeInTheDocument();
    });
  });

  describe("given Dashboard route", () => {
    it("when rendered, then Dashboard link is active", () => {
      vi.mocked(usePathname).mockReturnValue("/admin");
      render(<AdminNav />);
      const dashboardLink = screen.getByText("Dashboard").closest("a");
      expect(dashboardLink).toHaveClass("active");
    });

    it("when rendered, then other links are not active", () => {
      vi.mocked(usePathname).mockReturnValue("/admin");
      render(<AdminNav />);
      const links = screen.getAllByRole("link");
      links.forEach((link) => {
        if (link.textContent === "Dashboard") {
          expect(link).toHaveClass("active");
        } else {
          expect(link).not.toHaveClass("active");
        }
      });
    });
  });

  describe("given Collections route", () => {
    it("when rendered, then Collections link is active", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/collections");
      render(<AdminNav />);
      const link = screen.getByText("Collections").closest("a");
      expect(link).toHaveClass("active");
    });
  });

  describe("given a nested collections route", () => {
    it("when rendered, then Collections link is still active", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/collections/123");
      render(<AdminNav />);
      const link = screen.getByText("Collections").closest("a");
      expect(link).toHaveClass("active");
    });
  });

  describe("given a similarly-named route", () => {
    it("when rendered, then Collections-extra link is not active", () => {
      vi.mocked(usePathname).mockReturnValue("/admin/collections-extra");
      render(<AdminNav />);
      const link = screen.getByText("Collections").closest("a");
      expect(link).not.toHaveClass("active");
    });
  });
});
