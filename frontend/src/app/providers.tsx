// Providers wrapper — required because SessionProvider is a client component
// and cannot be used directly in the server-side RootLayout.
"use client";

import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
