"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FlipHorizontal2,
  Maximize2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { NFT } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import {
  compositeFramed,
  type CapturedPhoto,
  type PhotoResult,
} from "@/lib/photo";
import { useNFTImage } from "@/components/ar/useNFTImage";
import { useCutoutImage } from "@/components/ar/useCutoutImage";
import { usePinchZoom } from "./usePinchZoom";
import { NumberPickSheet } from "./NumberPickSheet";
import { PixelButton } from "@/components/ui/PixelButton";

interface MonkeSlot {
  id: string;
  cx: number;
  cy: number;
  size: number;
  nft: NFT | null;
  cutout: HTMLImageElement | null;
  flip: boolean; // mirror this monke horizontally
  source: "auto" | "manual";
}

interface PhotoEditorProps {
  photo: CapturedPhoto;
  initialNFT: NFT | null;
  onDone: (result: PhotoResult) => void;
  onRetake: () => void;
}

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
  Math.random().toString(36).slice(2);

/**
 * One-screen, mobile-first photo editor. The base photo + monke overlays live in
 * photo-pixel space inside a pinch-zoom/pan wrapper. No face detection: the monke
 * you picked in the finder starts pre-placed (centered); drag/resize it and tap
 * ADD MONKE to attach more people by number. CONFIRM flattens the framed view to
 * a JPEG.
 */
export function PhotoEditor({
  photo,
  initialNFT,
  onDone,
  onRetake,
}: PhotoEditorProps) {
  const removeBg = useAppStore((s) => s.mask.removeBg);

  const [slots, setSlots] = useState<MonkeSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickingForId, setPickingForId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Latest slots for the pointer callbacks (which are set up once).
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  const sizeMin = Math.round(Math.min(photo.w, photo.h) * 0.08);
  const sizeMax = Math.round(Math.max(photo.w, photo.h) * 1.3);

  // A single pointer pipeline drives BOTH the photo pan/zoom and the monke
  // move/resize, so a two-finger pinch zooms the photo even when fingers land on
  // a monke (the old per-monke handlers swallowed the 2nd touch). Resize is a
  // corner-handle drag — fully gesture-driven on mobile (the slider is desktop
  // -only now).
  const { containerRef, transform, screenToPhoto, bind } = usePinchZoom(
    photo.w,
    photo.h,
    {
      hitTest: (target) => {
        const el = target as Element | null;
        const r = el?.closest?.("[data-resize]");
        if (r) return { id: r.getAttribute("data-resize")!, kind: "resize" };
        const m = el?.closest?.("[data-monke]");
        if (m) return { id: m.getAttribute("data-monke")!, kind: "move" };
        return null;
      },
      onSelect: (id) => setSelectedId(id),
      onMove: (id, dx, dy) =>
        setSlots((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, cx: s.cx + dx, cy: s.cy + dy } : s
          )
        ),
      onResize: (id, x, y) =>
        setSlots((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  size: Math.round(
                    Math.min(
                      sizeMax,
                      Math.max(
                        sizeMin,
                        2 * Math.max(Math.abs(x - s.cx), Math.abs(y - s.cy))
                      )
                    )
                  ),
                }
              : s
          )
        ),
      onTap: (id) => {
        const slot = slotsRef.current.find((s) => s.id === id);
        if (slot?.cutout) setSelectedId(id);
        else setPickingForId(id);
      },
    }
  );

  const photoUrl = useMemo(
    () => photo.canvas.toDataURL("image/jpeg", 0.92),
    [photo]
  );

  // Prepare the chosen monke's cutout up-front (it starts pre-placed).
  const { image: initRaw } = useNFTImage(initialNFT?.image);
  const initCutout = useCutoutImage(initRaw, removeBg);

  // Seed one slot with the monke picked in the finder, centered. The user came
  // here having already chosen it, so it's ready to go — drag/resize, or ADD
  // MONKE for more. No face detection.
  useEffect(() => {
    setSlots([
      {
        id: uid(),
        cx: photo.w / 2,
        cy: photo.h / 2,
        size: Math.min(photo.w, photo.h) * 0.5,
        nft: initialNFT,
        cutout: null,
        flip: false,
        source: "auto",
      },
    ]);
    // initialNFT is fixed for a given capture; photo identity drives this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  // Keep the pre-placed slot's cutout in sync as background removal resolves.
  useEffect(() => {
    setSlots((prev) =>
      prev.map((s) => (s.source === "auto" ? { ...s, cutout: initCutout } : s))
    );
  }, [initCutout]);

  // ---- toolbar actions ----
  const addManualSlot = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const center = screenToPhoto(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    const id = uid();
    setSlots((prev) => [
      ...prev,
      {
        id,
        cx: center.x,
        cy: center.y,
        size: Math.min(photo.w, photo.h) * 0.4,
        nft: null,
        cutout: null,
        flip: false,
        source: "manual",
      },
    ]);
    setPickingForId(id);
  };

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
  };

  const resizeSelected = (size: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, size } : s))
    );
  };

  const flipSelected = () => {
    setSlots((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, flip: !s.flip } : s))
    );
  };

  const onPick = (nft: NFT, cutout: HTMLImageElement) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === pickingForId ? { ...s, nft, cutout } : s
      )
    );
    setSelectedId(pickingForId);
    setPickingForId(null);
  };

  const confirm = async () => {
    const placed = slots
      .filter((s) => s.cutout)
      .map((s) => ({
        cx: s.cx,
        cy: s.cy,
        size: s.size,
        cutout: s.cutout,
        flip: s.flip,
      }));
    if (placed.length === 0) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setBusy(true);
    try {
      // Export exactly the framed view (WYSIWYG): the user's pan/zoom is the crop.
      const result = await compositeFramed(photo, placed, {
        w: rect.width,
        h: rect.height,
        scale: transform.scale,
        tx: transform.tx,
        ty: transform.ty,
      });
      onDone(result);
    } finally {
      setBusy(false);
    }
  };

  const selected = slots.find((s) => s.id === selectedId) ?? null;
  const placedCount = slots.filter((s) => s.cutout).length;

  return (
    <div className="absolute inset-0 z-40 bg-screen flex flex-col">
      {/* Zoomable stage */}
      <div
        ref={containerRef}
        {...bind}
        className="relative flex-1 overflow-hidden touch-none bg-grid"
      >
        <div
          className="absolute top-0 left-0"
          style={{
            width: photo.w,
            height: photo.h,
            transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl}
            alt="Your photo"
            width={photo.w}
            height={photo.h}
            draggable={false}
            className="block select-none pointer-events-none"
          />

          {slots.map((slot) => {
            const isSel = slot.id === selectedId;
            return (
              <div
                key={slot.id}
                data-monke={slot.id}
                className="absolute touch-none"
                style={{
                  left: slot.cx - slot.size / 2,
                  top: slot.cy - slot.size / 2,
                  width: slot.size,
                  height: slot.size,
                }}
              >
                {slot.cutout ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slot.cutout.src}
                    alt={slot.nft?.name ?? "monke"}
                    width={slot.size}
                    height={slot.size}
                    draggable={false}
                    style={{ transform: slot.flip ? "scaleX(-1)" : undefined }}
                    className={`w-full h-full object-contain select-none pointer-events-none ${
                      isSel ? "outline-dashed outline-2 outline-banana" : ""
                    }`}
                  />
                ) : (
                  <div className="w-full h-full bg-pixelred/35 border-2 border-pixelred flex items-center justify-center pointer-events-none">
                    {/* Counter-scale the badge so it stays readable at any zoom. */}
                    <span
                      className="rounded-full bg-pixelred text-cream p-2"
                      style={{
                        transform: `scale(${1 / transform.scale})`,
                      }}
                    >
                      <Plus size={20} strokeWidth={3} />
                    </span>
                  </div>
                )}

                {/* Corner resize handle (selected monke) — drag to scale. */}
                {isSel && slot.cutout && (
                  <span
                    data-resize={slot.id}
                    aria-label="Resize monke"
                    className="absolute right-0 bottom-0 bg-banana text-screen border-2 border-screen rounded-full flex items-center justify-center touch-none"
                    style={{
                      width: 30,
                      height: 30,
                      transform: `translate(45%, 45%) scale(${1 / transform.scale})`,
                      transformOrigin: "bottom right",
                    }}
                  >
                    <Maximize2 size={16} strokeWidth={3} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Hint */}
        <div className="absolute top-0 inset-x-0 z-10 flex justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none">
          <span className="font-[family-name:var(--font-display)] text-banana text-[9px] bg-screen/70 px-3 py-2 border-[2px] border-banana/70 backdrop-blur-sm text-center">
            DRAG TO MOVE · PINCH TO ZOOM · DRAG CORNER TO RESIZE
          </span>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 bg-screen/95 border-t-[3px] border-banana p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
        {/* Per-monke controls when one is selected */}
        {selected && selected.cutout && (
          <div className="flex items-center gap-3 justify-center md:justify-start">
            {/* Desktop size slider; on mobile you pinch / drag the corner handle. */}
            <input
              type="range"
              min={sizeMin}
              max={sizeMax}
              step={1}
              value={selected.size}
              onChange={(e) => resizeSelected(Number(e.target.value))}
              className="flex-1 hidden md:block"
              aria-label="Monke size"
            />
            <button
              onClick={flipSelected}
              aria-label="Flip monke"
              aria-pressed={selected.flip}
              title="Flip monke"
              className={`border-[2px] p-2 active:scale-95 ${
                selected.flip
                  ? "border-banana text-banana"
                  : "border-cream/40 text-cream/80"
              }`}
            >
              <FlipHorizontal2 size={16} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setPickingForId(selected.id)}
              className="font-[family-name:var(--font-display)] text-[9px] text-cream/80 border-[2px] border-cream/40 px-2 py-2 active:scale-95"
            >
              #{selected.nft?.id ?? "?"}
            </button>
            <button
              onClick={() => removeSlot(selected.id)}
              aria-label="Remove monke"
              className="text-pixelred border-[2px] border-pixelred/60 p-2 active:scale-95"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <PixelButton
            variant="ghost"
            size="sm"
            onClick={onRetake}
            className="flex items-center gap-1"
          >
            <RotateCcw size={14} strokeWidth={3} />
            RETAKE
          </PixelButton>
          <PixelButton
            variant="ghost"
            size="sm"
            onClick={addManualSlot}
            className="flex items-center gap-1"
          >
            <Plus size={14} strokeWidth={3} />
            ADD MONKE
          </PixelButton>
          <PixelButton
            size="md"
            onClick={confirm}
            disabled={placedCount === 0 || busy}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={3} />
            {busy ? "SAVING…" : "CONFIRM"}
          </PixelButton>
        </div>
      </div>

      {pickingForId && (
        <NumberPickSheet
          collectionDefault={initialNFT?.collection ?? "gen2"}
          onPick={onPick}
          onClose={() => setPickingForId(null)}
        />
      )}
    </div>
  );
}
