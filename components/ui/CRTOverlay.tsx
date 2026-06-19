"use client";

import { usePathname } from "next/navigation";

/**
 * Full-screen CRT scanline + flicker overlay.
 * Pure CSS (see .crt-overlay in globals.css). pointer-events: none so it
 * never blocks interaction. Rendered once at the root.
 *
 * Suppressed on the camera/record view: the scanline + overlay blend looked
 * like a "filter" sitting on the live camera, so the recording stage stays clean.
 */
export function CRTOverlay() {
  const pathname = usePathname();
  if (pathname?.startsWith("/record")) return null;
  return <div className="crt-overlay" aria-hidden="true" />;
}
