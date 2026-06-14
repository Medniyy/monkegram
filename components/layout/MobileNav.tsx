"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Video } from "lucide-react";

const NAV = [
  { href: "/", label: "FIND", icon: Search },
  { href: "/record", label: "RECORD", icon: Video },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 grid grid-cols-2 bg-screen border-t-[3px] border-grid">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
              active ? "text-banana" : "text-cream/50"
            }`}
          >
            <Icon size={22} strokeWidth={2.5} />
            <span className="font-[family-name:var(--font-display)] text-[9px]">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
