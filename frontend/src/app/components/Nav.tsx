"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Nav() {
  const { data: session } = useSession();

  return (
    <nav aria-label="Main navigation">
      <Link href="/">Home</Link>
      {session && (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/admin">Admin</Link>
          <span className="user-info">{session.user?.email}</span>
        </>
      )}
    </nav>
  );
}
