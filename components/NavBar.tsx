"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/db";

type NavUser = {
  name?: string | null;
  email?: string | null;
  role: Role;
};

const links = [
  { href: "/", label: "Calendar" },
  { href: "/bookings", label: "My Bookings" },
  { href: "/account", label: "Account" },
];

export default function NavBar({ user }: { user: NavUser }) {
  const pathname = usePathname();

  return (
    <header className="bg-navy text-cream border-b-4 border-orange">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="font-display text-3xl tracking-widest">
          THE PADDOCK
        </Link>
        <nav className="flex items-center gap-4 flex-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`uppercase tracking-wider text-sm font-semibold py-1 border-b-2 transition-colors ${
                pathname === l.href
                  ? "border-orange text-orange"
                  : "border-transparent hover:border-cream"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link
              href="/admin"
              className={`uppercase tracking-wider text-sm font-semibold py-1 border-b-2 transition-colors ${
                pathname.startsWith("/admin")
                  ? "border-orange text-orange"
                  : "border-transparent hover:border-cream"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="uppercase tracking-wider opacity-80">
            {user.name ?? user.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-red text-cream uppercase tracking-wider px-3 py-1 text-xs font-semibold hover:bg-orange transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
