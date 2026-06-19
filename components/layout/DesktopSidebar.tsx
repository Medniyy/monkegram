"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Video } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";

const NAV = [
  { href: "/find", label: "FIND", icon: Search },
  { href: "/record", label: "RECORD", icon: Video },
];

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r-[3px] border-grid bg-screen p-5 gap-8">
      {/* Brand */}
      <Link href="/" className="flex items-center gap-3">
        <BrandLogo size={44} className="shrink-0" />
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-banana text-lg leading-tight">
            MONKE
            <br />
            GRAM
          </h1>
          <p className="text-cream/50 text-base mt-2">wear your monkey</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
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
    </aside>
  );
}
