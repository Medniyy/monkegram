"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  ScanFace,
  Video,
  Download,
  X,
  type LucideIcon,
} from "lucide-react";
import { isInAppShell } from "@/lib/bridge";

interface Slide {
  icon: LucideIcon;
  title: string;
  body: string;
}

// Web visitors find a monke by number; inside the app the wallet has already
// verified ownership, so the monkeys are simply theirs — different first slide.
const WEB_SLIDES: Slide[] = [
  {
    icon: Search,
    title: "FIND YOUR MONKE",
    body: "Type your SMB number — or pick one you hold. Gen2 & Gen3.",
  },
  {
    icon: ScanFace,
    title: "WEAR IT",
    body: "Your monke locks onto your face and follows it. Live.",
  },
  {
    icon: Video,
    title: "RECORD",
    body: "Hit the button. Talk, move, vibe — sound included.",
  },
  {
    icon: Download,
    title: "SAVE & SHARE",
    body: "Download the clip and post it anywhere. Tag @MonkeDAO.",
  },
];

const APP_SLIDES: Slide[] = [
  {
    icon: Search,
    title: "FIND YOUR MONKE",
    body: "Type any SMB number to wear it — Gen2 & Gen3.",
  },
  {
    icon: ScanFace,
    title: "WEAR IT",
    body: "Tap a monke and it locks onto your face. Live.",
  },
  {
    icon: Video,
    title: "RECORD",
    body: "Hit the button. Talk, move, vibe — sound included.",
  },
  {
    icon: Download,
    title: "SAVE & SHARE",
    body: "Download the clip and post it anywhere. Tag @MonkeDAO.",
  },
];

const SLIDE_MS = 4200;

/**
 * Instagram-stories style onboarding. Auto-advancing segmented progress bars,
 * tap left/right to scrub, tap-and-hold to pause. Calls `onDone` after the last
 * slide or when skipped.
 */
export function StoryTutorial({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Bumped on every manual jump so the progress bar animation restarts cleanly.
  const [tick, setTick] = useState(0);
  // Pick the copy for the context (in-app vs plain web). Computed on mount so
  // it's client-side only (avoids an SSR/hydration mismatch).
  const [slides] = useState(() => (isInAppShell() ? APP_SLIDES : WEB_SLIDES));
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  const go = useCallback(
    (next: number) => {
      if (next < 0) return;
      if (next >= slides.length) {
        onDone();
        return;
      }
      elapsedRef.current = 0;
      setIndex(next);
      setTick((t) => t + 1);
    },
    [onDone, slides.length]
  );

  // Auto-advance timer. Tracks elapsed so pause/resume keeps the remaining time.
  useEffect(() => {
    if (paused) return;
    startRef.current = performance.now();
    const remaining = SLIDE_MS - elapsedRef.current;
    const id = window.setTimeout(() => {
      elapsedRef.current = 0;
      go(index + 1);
    }, remaining);
    return () => {
      elapsedRef.current += performance.now() - startRef.current;
      window.clearTimeout(id);
    };
  }, [index, paused, tick, go]);

  // Keyboard: arrows to scrub, Esc to skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onDone]);

  const slide = slides[index];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-screen flex flex-col select-none">
      {/* Progress bars */}
      <div className="flex gap-1.5 px-3 pt-3">
        {slides.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 bg-grid border border-cream/20 overflow-hidden"
          >
            {/* key includes `tick` so the CSS fill restarts on a manual jump */}
            <div
              key={`${i}-${tick}`}
              className="h-full bg-banana"
              style={
                i < index
                  ? { width: "100%" }
                  : i === index
                  ? {
                      width: "100%",
                      animation: `story-fill ${SLIDE_MS}ms linear forwards`,
                      animationPlayState: paused ? "paused" : "running",
                    }
                  : { width: "0%" }
              }
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="font-[family-name:var(--font-display)] text-banana text-[10px]">
          HOW IT WORKS
        </span>
        <button
          onClick={onDone}
          aria-label="Skip tutorial"
          className="text-cream/70 hover:text-cream p-1"
        >
          <X size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Slide */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center text-center px-8 gap-6"
        key={index}
      >
        <div className="power-on pixel-border-banana bg-grid p-8">
          <Icon
            size={88}
            strokeWidth={1.75}
            className="text-banana"
            aria-hidden
          />
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-cream text-lg md:text-2xl leading-snug max-w-sm">
          {slide.title}
        </h2>
        <p className="text-cream/70 text-xl md:text-2xl max-w-sm leading-relaxed">
          {slide.body}
        </p>
        <span className="font-[family-name:var(--font-display)] text-cream/30 text-[9px] mt-2">
          {index + 1} / {slides.length}
        </span>
      </div>

      {/* Tap zones — left = back, right = next. Hold to pause. */}
      <button
        aria-label="Previous"
        className="absolute left-0 top-16 bottom-0 w-1/3"
        onClick={() => go(index - 1)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
      <button
        aria-label="Next"
        className="absolute right-0 top-16 bottom-0 w-2/3"
        onClick={() => go(index + 1)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
    </div>
  );
}
