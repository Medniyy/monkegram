import { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileNav } from "./MobileNav";

/**
 * Responsive layout switcher.
 * Desktop (>=768px): fixed left sidebar + scrollable main.
 * Mobile (<768px): full-bleed main + fixed bottom tab bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <DesktopSidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
