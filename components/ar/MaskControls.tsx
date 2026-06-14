"use client";

import { FlipHorizontal2 } from "lucide-react";
import { useAppStore, type BlendMode } from "@/store/useAppStore";

const BLENDS: { id: BlendMode; label: string }[] = [
  { id: "source-over", label: "NORMAL" },
  { id: "multiply", label: "MULTIPLY" },
  { id: "screen", label: "SCREEN" },
];

/** Opacity / size / flip / blend controls, wired to the Zustand store. */
export function MaskControls() {
  const mask = useAppStore((s) => s.mask);
  const setMask = useAppStore((s) => s.setMask);

  return (
    <div className="flex flex-col gap-4">
      <Slider
        label={`OPACITY · ${Math.round(mask.opacity * 100)}%`}
        min={0}
        max={1}
        step={0.01}
        value={mask.opacity}
        onChange={(v) => setMask({ opacity: v })}
      />
      <Slider
        label={`SIZE · ${mask.sizeOffset >= 0 ? "+" : ""}${Math.round(
          mask.sizeOffset * 100
        )}%`}
        min={-0.2}
        max={0.3}
        step={0.01}
        value={mask.sizeOffset}
        onChange={(v) => setMask({ sizeOffset: v })}
      />

      <div className="flex gap-2">
        {/* Blend mode */}
        <div className="flex-1">
          <p className="font-[family-name:var(--font-display)] text-[9px] text-cream/50 mb-1">
            BLEND
          </p>
          <div className="flex">
            {BLENDS.map((b) => (
              <button
                key={b.id}
                onClick={() => setMask({ blend: b.id })}
                className={`flex-1 font-[family-name:var(--font-display)] text-[8px] py-2 border-[2px] -ml-[2px] first:ml-0 transition-colors ${
                  mask.blend === b.id
                    ? "bg-banana text-screen border-banana z-10"
                    : "bg-grid text-cream/60 border-cream/30"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flip */}
        <div>
          <p className="font-[family-name:var(--font-display)] text-[9px] text-cream/50 mb-1">
            FLIP
          </p>
          <button
            onClick={() => setMask({ flip: !mask.flip })}
            aria-pressed={mask.flip}
            className={`p-2 border-[2px] transition-colors ${
              mask.flip
                ? "bg-banana text-screen border-banana"
                : "bg-grid text-cream/60 border-cream/30"
            }`}
          >
            <FlipHorizontal2 size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block">
      <span className="font-[family-name:var(--font-display)] text-[9px] text-cream/50">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1"
      />
    </label>
  );
}
