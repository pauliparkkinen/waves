import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SignInButton from "../SignInButton";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

import { signIn } from "next-auth/react";

describe("SignInButton", () => {
  describe("given the button is rendered", () => {
    it("when rendered, then shows Sign in text", () => {
      render(<SignInButton />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("when clicked, then calls signIn with zitadel provider", () => {
      render(<SignInButton />);
      fireEvent.click(screen.getByRole("button"));
      expect(signIn).toHaveBeenCalledWith("zitadel");
    });
  });
});
