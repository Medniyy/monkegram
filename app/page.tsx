"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PixelButton } from "@/components/ui/PixelButton";
import { StoryTutorial } from "@/components/onboarding/StoryTutorial";

const ONBOARDED_KEY = "monkegram:onboarded";

/**
 * The opener. A minimal welcome screen with a single ENTER button, plus the
 * Instagram-stories tutorial that auto-plays on a first visit (and can be
 * replayed). Inside the native shell we skip straight to the picker.
 */
export default function Welcome() {
  const router = useRouter();
  const [showTutorial, setShowTutorial] = useState(false);

  // First-time visitors (web or inside the native app) get the stories tutorial
  // automatically. The welcome is the opener everywhere — no auto-skip.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDED_KEY)) setShowTutorial(true);
    } catch {
      /* storage disabled — just skip the auto tutorial */
    }
  }, []);

  const enter = () => router.push("/find");

  const dismissTutorial = () => {
    setShowTutorial(false);
    try {
      window.localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      /* non-fatal */
    }
  };

  return (
    <main className="relative min-h-dvh flex flex-col items-center justify-center text-center px-6 py-12 overflow-hidden">
      {/* Soft banana glow behind the mark */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[min(80vw,420px)] aspect-square rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--color-banana)" }}
      />

      <div className="relative flex flex-col items-center gap-6">
        <BrandLogo size={112} className="power-on" />

        <div>
          <h1 className="font-[family-name:var(--font-display)] text-banana text-3xl md:text-5xl leading-tight">
            MONKEGRAM
          </h1>
          <p className="text-cream/60 text-xl md:text-2xl mt-3">
            Return to Monke
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 mt-4">
          <PixelButton
            size="lg"
            onClick={enter}
            className="flex items-center gap-2"
          >
            ENTER
            <ArrowRight size={16} strokeWidth={3} />
          </PixelButton>

          <button
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[10px] text-cream/50 hover:text-banana transition-colors py-2"
          >
            <Play size={12} strokeWidth={3} />
            HOW IT WORKS
          </button>
        </div>
      </div>

      {showTutorial && <StoryTutorial onDone={dismissTutorial} />}
    </main>
  );
}
