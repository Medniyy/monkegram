"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

export interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

const MAX_ZOOM = 8; // relative to the fit scale

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Pinch-to-zoom + drag-to-pan for a fixed-size photo inside a container, built
 * on raw pointer events (no gesture dependency — the project hand-rolls this
 * kind of thing). The returned transform is applied as
 * `translate(tx,ty) scale(scale)` (origin 0 0) to a wrapper sized to the photo's
 * natural pixels; `screenToPhoto` converts a touch point back to photo pixels so
 * callers can hit-test and drag overlays placed in photo space.
 *
 * A single finger pans; two fingers zoom around their midpoint. Overlays that
 * want to handle their own drag should `stopPropagation()` on pointerdown so the
 * background pan doesn't also fire.
 */
export function usePinchZoom(photoW: number, photoH: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [t, setT] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });
  // Mirror the latest transform into a ref so screenToPhoto (called from pointer
  // handlers, after commit) can read it without being a dependency.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const minScaleRef = useRef(1);

  // Pointer bookkeeping for the active gesture.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    mode: "idle" | "pan" | "pinch";
    last: { x: number; y: number };
    lastMid: { x: number; y: number };
    lastDist: number;
  }>({ mode: "idle", last: { x: 0, y: 0 }, lastMid: { x: 0, y: 0 }, lastDist: 0 });

  // Fit the photo into the container and center it (the "zoomed-out" baseline).
  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el || !photoW || !photoH) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const scale = Math.min(cw / photoW, ch / photoH);
    minScaleRef.current = scale;
    setT({
      scale,
      tx: (cw - photoW * scale) / 2,
      ty: (ch - photoH * scale) / 2,
    });
  }, [photoW, photoH]);

  useLayoutEffect(() => {
    fit();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
  };

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const n = pointers.current.size;
    if (n === 1) {
      gesture.current.mode = "pan";
      gesture.current.last = p;
    } else if (n === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.mode = "pinch";
      gesture.current.lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture.current.lastDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    }
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const g = gesture.current;
      const ratio = dist / (g.lastDist || dist);
      setT((cur) => {
        const min = minScaleRef.current;
        const scale = clamp(cur.scale * ratio, min, min * MAX_ZOOM);
        const real = scale / cur.scale;
        const tx = mid.x - (mid.x - cur.tx) * real + (mid.x - g.lastMid.x);
        const ty = mid.y - (mid.y - cur.ty) * real + (mid.y - g.lastMid.y);
        return { scale, tx, ty };
      });
      g.lastMid = mid;
      g.lastDist = dist;
    } else if (gesture.current.mode === "pan") {
      const last = gesture.current.last;
      const dx = p.x - last.x;
      const dy = p.y - last.y;
      gesture.current.last = p;
      setT((cur) => ({ ...cur, tx: cur.tx + dx, ty: cur.ty + dy }));
    }
  }, []);

  const endPointer = useCallback((e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current.mode = "pan";
      gesture.current.last = pts[0];
    } else if (pts.length === 0) {
      gesture.current.mode = "idle";
    }
  }, []);

  // Mouse-wheel zoom (desktop) around the cursor — the desktop equivalent of a
  // two-finger pinch. The editor is a fixed overlay with nothing to scroll, so
  // we don't need to preventDefault (which a passive wheel listener can't do).
  const onWheel = useCallback((e: ReactWheelEvent) => {
    const p = local(e);
    const factor = Math.exp(-e.deltaY * 0.0015);
    setT((cur) => {
      const min = minScaleRef.current;
      const scale = clamp(cur.scale * factor, min, min * MAX_ZOOM);
      const real = scale / cur.scale;
      const tx = p.x - (p.x - cur.tx) * real;
      const ty = p.y - (p.y - cur.ty) * real;
      return { scale, tx, ty };
    });
  }, []);

  // Convert a screen point (clientX/Y) to photo-pixel coordinates.
  const screenToPhoto = useCallback((clientX: number, clientY: number) => {
    const { x, y } = local({ clientX, clientY });
    const cur = tRef.current;
    return { x: (x - cur.tx) / cur.scale, y: (y - cur.ty) / cur.scale };
  }, []);

  // Keep the transform from drifting if the photo size changes.
  useEffect(() => {
    fit();
  }, [photoW, photoH, fit]);

  return {
    containerRef,
    transform: t,
    screenToPhoto,
    reset: fit,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onWheel,
    },
  };
}
