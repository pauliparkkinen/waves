"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/forms", label: "Forms" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/sections", label: "Sections" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname === link.href || pathname.startsWith(link.href + "/")
              ? "active"
              : undefined
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
