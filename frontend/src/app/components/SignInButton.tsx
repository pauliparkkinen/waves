"use client";

import { signIn } from "next-auth/react";

const provider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "zitadel";

export default function SignInButton() {
  return (
    <button className="btn-primary" onClick={() => signIn(provider)}>
      Sign in
    </button>
  );
}
