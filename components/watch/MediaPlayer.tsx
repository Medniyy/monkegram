"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
} from "lucide-react";
import { BASE_PATH } from "@/lib/basePath";
import { BrandLogo } from "@/components/ui/BrandLogo";

interface Clip {
  id: string;
  label: string;
  title: string;
  src: string;
  poster: string;
}

const CLIPS: Clip[] = [
  {
    id: "demo",
    label: "DEMO",
    title: "MonkeGram — Demo",
    src: `${BASE_PATH}/videos/demo.mp4`,
    poster: `${BASE_PATH}/videos/demo-poster.jpg`,
  },
  {
    id: "pitch",
    label: "PITCH",
    title: "MonkeGram — Pitch",
    src: `${BASE_PATH}/videos/pitch.mp4`,
    poster: `${BASE_PATH}/videos/pitch-poster.jpg`,
  },
];

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * A Windows Media Player-styled video viewer in the MonkeGram palette: a beveled
 * "window" with a gold title bar, a black stage, a transport/seek/volume strip,
 * and a DEMO / PITCH tab switcher below. Custom controls (not native) so the
 * retro chrome is consistent everywhere.
 */
export function MediaPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  const [activeId, setActiveId] = useState(CLIPS[0].id);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  // Set once the user has chosen a clip, so we only autoplay on switch (not on
  // first load — browsers would block a sound-on autoplay anyway).
  const userStartedRef = useRef(false);

  const active = CLIPS.find((c) => c.id === activeId) ?? CLIPS[0];

  // Wire up media events for the current <video>.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [activeId]);

  // On clip switch (after the first user interaction), start the new clip.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(0);
    setDuration(0);
    if (userStartedRef.current) v.play().catch(() => {});
  }, [activeId]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    userStartedRef.current = true;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const selectClip = useCallback(
    (id: string) => {
      if (id === activeId) {
        togglePlay();
        return;
      }
      userStartedRef.current = true;
      setActiveId(id);
    },
    [activeId, togglePlay]
  );

  const seekTo = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const v = videoRef.current;
      if (!v || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      v.currentTime = ratio * duration;
      setCurrent(v.currentTime);
    },
    [duration]
  );

  const restart = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setCurrent(0);
  }, []);

  const nextClip = useCallback(() => {
    const idx = CLIPS.findIndex((c) => c.id === activeId);
    selectClip(CLIPS[(idx + 1) % CLIPS.length].id);
  }, [activeId, selectClip]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const changeVolume = useCallback((value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = value;
    v.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
  }, []);

  const goFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => {});
  }, []);

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Media player window */}
      <div ref={shellRef} className="pixel-border bg-grid">
        {/* Title bar */}
        <div className="flex items-center gap-2 bg-banana text-screen px-3 py-2">
          <BrandLogo size={18} className="shrink-0" />
          <span className="font-[family-name:var(--font-display)] text-[9px] truncate">
            MONKEGRAM MEDIA PLAYER
          </span>
          <div className="ml-auto flex items-center gap-1.5" aria-hidden>
            <span className="w-3 h-3 border-2 border-screen/70" />
            <span className="w-3 h-3 border-2 border-screen/70" />
            <span className="w-3 h-3 border-2 border-screen/70 bg-screen/70" />
          </div>
        </div>

        {/* Stage */}
        <div className="relative bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            key={active.id}
            src={active.src}
            poster={active.poster}
            playsInline
            preload="metadata"
            muted={muted}
            onClick={togglePlay}
            className="w-auto h-auto max-w-full max-h-[62vh] object-contain cursor-pointer"
          />
          {/* Big center play affordance when paused */}
          {!playing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label="Play"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="flex items-center justify-center w-16 h-16 bg-banana/90 text-screen pixel-border">
                <Play size={26} strokeWidth={3} className="ml-1" />
              </span>
            </button>
          )}
        </div>

        {/* Seek bar */}
        <div className="px-3 pt-3 bg-grid">
          <div
            onClick={seekTo}
            className="relative h-3 bg-screen border-2 border-cream/60 cursor-pointer"
          >
            <div
              className="absolute inset-y-0 left-0 bg-banana"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 font-[family-name:var(--font-body)] text-cream/70 text-lg leading-none">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Transport controls */}
        <div className="flex items-center gap-2 px-3 py-3 bg-grid">
          <button
            type="button"
            onClick={restart}
            aria-label="Restart"
            className="text-cream hover:text-banana transition-colors"
          >
            <SkipBack size={20} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="flex items-center justify-center w-10 h-10 bg-banana text-screen pixel-border hover:brightness-110 transition"
          >
            {playing ? (
              <Pause size={20} strokeWidth={3} />
            ) : (
              <Play size={20} strokeWidth={3} className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={nextClip}
            aria-label="Next clip"
            className="text-cream hover:text-banana transition-colors"
          >
            <SkipForward size={20} strokeWidth={2.5} />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="text-cream hover:text-banana transition-colors"
            >
              {muted || volume === 0 ? (
                <VolumeX size={20} strokeWidth={2.5} />
              ) : (
                <Volume2 size={20} strokeWidth={2.5} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Volume"
              className="w-16 accent-banana cursor-pointer"
            />
            <button
              type="button"
              onClick={goFullscreen}
              aria-label="Fullscreen"
              className="text-cream hover:text-banana transition-colors"
            >
              <Maximize2 size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* DEMO / PITCH switcher */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        {CLIPS.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => selectClip(c.id)}
              className={`py-3 font-[family-name:var(--font-display)] text-[11px] border-[3px] transition-colors ${
                isActive
                  ? "border-banana text-screen bg-banana"
                  : "border-grid text-cream/70 bg-grid hover:text-cream hover:border-cream/40"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
