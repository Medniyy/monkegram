"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

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
  const micStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [supported] = useState(() => pickMimeType() !== null);

  const stopMic = useCallback(() => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
  }, []);

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

  const start = useCallback(async () => {
    const canvas = canvasRef.current;
    const mimeType = pickMimeType();
    if (!canvas || !mimeType) return;

    // Free any prior recording.
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });

    const canvasStream = canvas.captureStream(30);
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    // Mix in microphone audio when enabled. If the mic is blocked or missing,
    // fall back to a silent (video-only) recording rather than failing.
    if (useAppStore.getState().audioEnabled) {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = mic;
        tracks.push(...mic.getAudioTracks());
      } catch {
        micStreamRef.current = null;
      }
    }

    const stream = new MediaStream(tracks);
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
      stopMic();
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
  }, [canvasRef, stop, stopMic]);

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
      stopMic();
    };
  }, [clearTimers, stopMic]);

  return { isRecording, elapsed, result, supported, start, stop, reset };
}
