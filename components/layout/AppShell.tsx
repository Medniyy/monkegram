"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileNav } from "./MobileNav";

/**
 * Responsive layout switcher.
 * Desktop (>=768px): fixed left sidebar + scrollable main.
 * Mobile (<768px): full-bleed main + fixed bottom tab bar.
 *
 * The welcome screen ("/") and the recorder ("/record") are full-bleed — they
 * render their own full-screen layout and get no app chrome (the recorder is a
 * camera view with its own overlay controls + back button). "/watch" is a
 * standalone, shareable demo/pitch page (not part of the app's tab flow), so it
 * is full-bleed too.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fullBleed =
    pathname === "/" ||
    pathname.startsWith("/record") ||
    pathname.startsWith("/watch");

  if (fullBleed) return <>{children}</>;

  return (
    <div className="flex min-h-dvh">
      <DesktopSidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
