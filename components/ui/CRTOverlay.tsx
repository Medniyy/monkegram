/**
 * Full-screen CRT scanline + flicker overlay.
 * Pure CSS (see .crt-overlay in globals.css). pointer-events: none so it
 * never blocks interaction. Rendered once at the root.
 */
export function CRTOverlay() {
  return <div className="crt-overlay" aria-hidden="true" />;
}
