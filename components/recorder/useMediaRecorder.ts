"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { useAppStore, VIDEO_QUALITY } from "@/store/useAppStore";

export const MAX_SECONDS = 60;

/** Opus at 128 kbps — clear voice, well above the WebView's low default. */
const AUDIO_BITRATE = 128_000;

/** High-quality mic capture. The WebRTC voice-processing chain (echo cancel /
 *  noise suppression / auto-gain) is tuned for phone calls and makes recorded
 *  audio sound thin and "underwater"; we disable it to capture raw, full-range
 *  stereo sound like the native camera does. */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  sampleRate: 48_000,
  channelCount: 2,
};

// WebM (VP8/VP9) first: Android's WebView records it with the hardware encoder,
// so it stays smooth at high resolution. MP4/H.264 via MediaRecorder often falls
// back to a slow software encoder on Android (near-zero fps), so it's only a
// last resort. (If X rejects the WebM on share, transcode/native-record is the
// next step — but don't trade smooth recording for an unconfirmed format need.)
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
 * Mixes in mic audio when enabled (falls back to silent if blocked). Video and
 * audio bitrates follow the selected quality preset.
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

    // Guard against re-entry: start() is async (it awaits the mic), so the
    // `isRecording` state lags a tap. Without this, a quick double-tap (or a
    // re-render) spins up a second recorder + a second interval, producing the
    // overlapping countdown that resumes from the previous clip's time.
    if (recorderRef.current && recorderRef.current.state === "recording") return;

    // Defensive: kill any timer left over from a prior session before we start
    // a new one, so a stale interval can't keep driving `elapsed`.
    clearTimers();

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
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: AUDIO_CONSTRAINTS,
        });
        micStreamRef.current = mic;
        tracks.push(...mic.getAudioTracks());
      } catch {
        micStreamRef.current = null;
      }
    }

    // Apply the selected quality preset's bitrate (the canvas resolution is
    // capped to match inside FaceMaskCanvas) plus a solid audio bitrate.
    const preset = VIDEO_QUALITY[useAppStore.getState().videoQuality];
    const stream = new MediaStream(tracks);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: preset.bitrate,
      audioBitsPerSecond: AUDIO_BITRATE,
    });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      // Stop the clock no matter how the recording ended (manual stop, the 60s
      // cap, or a track ending) so no interval survives into the next session.
      clearTimers();
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setResult({ blob, url, ext });
      setIsRecording(false);
      setElapsed(0);
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
  }, [canvasRef, stop, stopMic, clearTimers]);

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
