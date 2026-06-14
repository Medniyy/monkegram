"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

export const MAX_SECONDS = 60;

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4;codecs=avc1",
  "video/mp4",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  ext: string;
}

/**
 * Records the canvas via captureStream into a Blob. Enforces a hard 60s cap.
 * Video-only (no mic) for MVP — silent clips, zero extra permissions.
 */
export function useMediaRecorder(
  canvasRef: RefObject<HTMLCanvasElement | null>
) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [supported] = useState(() => pickMimeType() !== null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    timerRef.current = null;
    stopTimeoutRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    clearTimers();
  }, [clearTimers]);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    const mimeType = pickMimeType();
    if (!canvas || !mimeType) return;

    // Free any prior recording.
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setResult({ blob, url, ext });
      setIsRecording(false);
    };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
    setElapsed(0);

    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 100);
    stopTimeoutRef.current = setTimeout(stop, MAX_SECONDS * 1000);
  }, [canvasRef, stop]);

  const reset = useCallback(() => {
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setElapsed(0);
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
    };
  }, [clearTimers]);

  return { isRecording, elapsed, result, supported, start, stop, reset };
}
