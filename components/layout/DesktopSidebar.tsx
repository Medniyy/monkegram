"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Video } from "lucide-react";

const NAV = [
  { href: "/", label: "FIND", icon: Search },
  { href: "/record", label: "RECORD", icon: Video },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r-[3px] border-grid bg-screen p-5 gap-8">
      {/* Brand */}
      <Link href="/" className="block">
        <h1 className="font-[family-name:var(--font-display)] text-banana text-lg leading-tight">
          MONKE
          <br />
          GRAM
        </h1>
        <p className="text-cream/50 text-base mt-2">wear your monkey</p>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 border-[3px] transition-colors font-[family-name:var(--font-display)] text-[11px] ${
                active
                  ? "border-banana text-banana bg-grid"
                  : "border-transparent text-cream/70 hover:text-cream hover:border-grid"
              }`}
            >
              <Icon size={18} strokeWidth={2.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer badge */}
      <div className="mt-auto text-cream/40 text-base leading-snug">
        <p>NO WALLET</p>
        <p>NO LOGIN</p>
        <p>NO DATA STORED</p>
        <p className="text-jungle mt-2">$0 · 100% FREE</p>
      </div>
    </aside>
  );
}
