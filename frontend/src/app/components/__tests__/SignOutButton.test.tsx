import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SignOutButton from "../SignOutButton";

vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

import { signOut } from "next-auth/react";

describe("SignOutButton", () => {
  describe("given the button is rendered", () => {
    it("when rendered, then shows Sign out text", () => {
      render(<SignOutButton />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("when clicked, then calls signOut", () => {
      render(<SignOutButton />);
      fireEvent.click(screen.getByRole("button"));
      expect(signOut).toHaveBeenCalled();
    });
  });
});
