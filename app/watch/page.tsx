import type { Metadata } from "next";
import Link from "next/link";
import { MediaPlayer } from "@/components/watch/MediaPlayer";
import { BrandLogo } from "@/components/ui/BrandLogo";

export const metadata: Metadata = {
  title: "Watch — MonkeGram",
  description: "Watch the MonkeGram demo and pitch.",
};

export default function WatchPage() {
  return (
    <div className="min-h-dvh bg-screen flex flex-col">
      {/* Standalone header — brand links back into the app. */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b-[3px] border-grid">
        <Link href="/" className="flex items-center gap-3">
          <BrandLogo size={36} className="shrink-0" />
          <span className="font-[family-name:var(--font-display)] text-banana text-sm leading-none">
            MONKEGRAM
          </span>
        </Link>
        <Link
          href="/find"
          className="font-[family-name:var(--font-display)] text-cream/60 hover:text-banana text-[10px] transition-colors"
        >
          OPEN APP →
        </Link>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-8">
        <div className="text-center md:text-left">
          <h1 className="font-[family-name:var(--font-display)] text-banana text-2xl md:text-4xl leading-tight">
            WATCH
          </h1>
          <p className="text-cream/60 text-xl mt-2">
            See MonkeGram in action — the demo, and the pitch.
          </p>
        </div>

        <MediaPlayer />
      </main>
    </div>
  );
}
