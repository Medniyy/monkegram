"use client";

/**
 * RN ↔ WebView bridge.
 *
 * When MonkeGram runs inside the native MonkeGram shell (the Expo app), the
 * shell injects the wallet's verified-owned monkeys onto `window` so the web app
 * can show "YOUR MONKES" instead of a typed token number. Outside the shell
 * (plain web), none of this is present and the app behaves normally.
 */
import { useEffect, useState } from "react";
import type { Collection, NFT } from "./types";
import { getNFT, resilientImage } from "./nftData";

export interface BridgedMonkey {
  gen: Collection;
  number: number | null;
  name: string;
  image: string | null;
  mint: string;
}

declare global {
  interface Window {
    __MONKEGRAM_OWNED__?: BridgedMonkey[];
    __MONKEGRAM_SELECTED__?: BridgedMonkey | null;
    ReactNativeWebView?: unknown;
  }
}

function readBridgedOwned(): BridgedMonkey[] | null {
  if (typeof window === "undefined") return null;
  const v = window.__MONKEGRAM_OWNED__;
  return Array.isArray(v) ? v : null;
}

function readBridgedSelected(): BridgedMonkey | null {
  if (typeof window === "undefined") return null;
  const v = window.__MONKEGRAM_SELECTED__;
  return v && typeof v === "object" ? v : null;
}

/** True when running inside the MonkeGram native shell. */
export function isInAppShell(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ReactNativeWebView || Array.isArray(window.__MONKEGRAM_OWNED__);
}

/**
 * The wallet's owned monkeys as injected by the shell, or null when not running
 * in the shell. Re-reads when the shell fires the `monkegram-owned` event (it
 * re-delivers the list after the page loads, in case we mounted first).
 */
export function useBridgedOwned(): BridgedMonkey[] | null {
  const [owned, setOwned] = useState<BridgedMonkey[] | null>(() => readBridgedOwned());

  useEffect(() => {
    const update = () => setOwned(readBridgedOwned());
    update();
    window.addEventListener("monkegram-owned", update);
    return () => window.removeEventListener("monkegram-owned", update);
  }, []);

  return owned;
}

/**
 * The single monkey the user tapped in the native inventory, if any. When set,
 * the home page sends the user straight to the recorder wearing it (skipping the
 * in-web picker). Re-reads on the same `monkegram-owned` event.
 */
export function useBridgedSelected(): BridgedMonkey | null {
  const [selected, setSelected] = useState<BridgedMonkey | null>(() => readBridgedSelected());

  useEffect(() => {
    const update = () => setSelected(readBridgedSelected());
    update();
    window.addEventListener("monkegram-owned", update);
    return () => window.removeEventListener("monkegram-owned", update);
  }, []);

  return selected;
}

/**
 * Resolve bridged monkeys to full NFT records. Prefers the app's own bundled
 * data (known CORS-safe images, required for canvas recording), keyed by
 * gen+number; falls back to the shell-provided image if a token isn't found.
 */
export async function resolveBridged(owned: BridgedMonkey[]): Promise<NFT[]> {
  const out: NFT[] = [];
  for (const m of owned) {
    if (m.number != null) {
      const local = await getNFT(m.gen, m.number);
      if (local) {
        out.push(local);
        continue;
      }
    }
    if (m.image) {
      out.push({ id: m.number ?? 0, collection: m.gen, name: m.name, image: resilientImage(m.image) });
    }
  }
  return out;
}
