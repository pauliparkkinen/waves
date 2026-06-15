import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Nav from "../Nav";

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "next-auth/react";

// Mock next/link to render simple <a> tags
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Nav", () => {
  describe("given unauthenticated user", () => {
    it("when rendered, then shows Home link", () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });
      render(<Nav />);
      expect(screen.getByText("Home")).toBeInTheDocument();
    });

    it("when rendered, then does not show Dashboard link", () => {
      vi.mocked(useSession).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: vi.fn(),
      });
      render(<Nav />);
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });
  });

  describe("given authenticated user", () => {
    it("when rendered, then shows Home and Dashboard links", () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { email: "test@example.com" },
          expires: "2025-01-01",
          accessToken: "token123",
        },
        status: "authenticated",
        update: vi.fn(),
      });
      render(<Nav />);
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("when rendered, then shows user email", () => {
      vi.mocked(useSession).mockReturnValue({
        data: {
          user: { email: "test@example.com" },
          expires: "2025-01-01",
          accessToken: "token123",
        },
        status: "authenticated",
        update: vi.fn(),
      });
      render(<Nav />);
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });
  });
});
