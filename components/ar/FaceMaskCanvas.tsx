"use client";

import { RefObject, useEffect, useRef } from "react";
import { FaceLandmarker } from "@mediapipe/tasks-vision";
import { computeFaceBox } from "@/lib/imageUtils";
import { useAppStore, VIDEO_QUALITY } from "@/store/useAppStore";

interface FaceMaskCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarkerRef: RefObject<FaceLandmarker | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  nftImage: HTMLImageElement | null;
  onFaceChange?: (detected: boolean) => void;
  className?: string;
}

/**
 * The heart of the app: a requestAnimationFrame loop that draws the camera
 * frame, runs face detection, and composites the (square) NFT image onto the
 * user's head. The canvas it renders into is the recording source.
 */
export function FaceMaskCanvas({
  videoRef,
  landmarkerRef,
  canvasRef,
  nftImage,
  onFaceChange,
  className = "",
}: FaceMaskCanvasProps) {
  // Live mask settings, read inside the loop via a ref (no loop restarts).
  const mask = useAppStore((s) => s.mask);
  const videoQuality = useAppStore((s) => s.videoQuality);
  const maskRef = useRef(mask);
  const qualityRef = useRef(videoQuality);
  const nftRef = useRef(nftImage);
  const faceRef = useRef<boolean | null>(null);

  // Keep the loop's refs in sync with the latest props/state (after render).
  useEffect(() => {
    maskRef.current = mask;
  }, [mask]);
  useEffect(() => {
    qualityRef.current = videoQuality;
  }, [videoQuality]);
  useEffect(() => {
    nftRef.current = nftImage;
  }, [nftImage]);

  useEffect(() => {
    let raf = 0;

    const render = () => {
      raf = requestAnimationFrame(render);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      // Size the canvas to the video once it's known (capped for perf).
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw && vh) {
        const maxDim = VIDEO_QUALITY[qualityRef.current].maxDim;
        const scale = Math.min(1, maxDim / Math.max(vw, vh));
        const tw = Math.round(vw * scale);
        const th = Math.round(vh * scale);
        if (canvas.width !== tw || canvas.height !== th) {
          canvas.width = tw;
          canvas.height = th;
        }
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      // Detect face landmarks for this frame.
      let landmarks: { x: number; y: number }[] | null = null;
      const lm = landmarkerRef.current;
      if (lm) {
        try {
          const result = lm.detectForVideo(video, performance.now());
          if (result.faceLandmarks?.length) {
            landmarks = result.faceLandmarks[0];
          }
        } catch {
          /* detector not ready for this frame — skip */
        }
      }

      const detected = !!landmarks;
      if (faceRef.current !== detected) {
        faceRef.current = detected;
        onFaceChange?.(detected);
      }

      const { opacity, sizeOffset, flip, blend } = maskRef.current;

      ctx.save();
      if (flip) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);

      const img = nftRef.current;
      if (landmarks && img && img.complete && img.naturalWidth > 0) {
        const box = computeFaceBox(landmarks, w, h, sizeOffset);
        if (box) {
          ctx.globalAlpha = opacity;
          ctx.globalCompositeOperation = blend;
          ctx.drawImage(img, box.dx, box.dy, box.dw, box.dh);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.restore();
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
    // Loop is set up once; live values come from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
