"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { PixelButton } from "@/components/ui/PixelButton";
import type { NFT } from "@/lib/types";
import {
  canUseNativeClipBridge,
  sendClipToNative,
  type NativeClipAction,
} from "@/lib/nativeClipBridge";
import type { RecordingResult } from "./useMediaRecorder";

interface DownloadButtonProps {
  result: RecordingResult;
  nft: NFT | null;
}

/** Default caption auto-applied when sharing a clip. */
const SHARE_CAPTION = "Made with MonkeGram 🐵 @MonkeDAO #monkegram";

function buildFilename(nft: NFT | null, ext: string) {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(d.getDate()).padStart(2, "0")}`;
  const who = nft
    ? `${nft.collection}_${String(nft.id).padStart(4, "0")}`
    : "monke";
  return `monkegram_${who}_${stamp}.${ext}`;
}

const isIOS =
  typeof navigator !== "undefined" &&
  /iP(hone|ad|od)/.test(navigator.userAgent);

export function DownloadButton({ result, nft }: DownloadButtonProps) {
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [busy, setBusy] = useState<NativeClipAction | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const filename = buildFilename(nft, result.ext);
  const hasNativeBridge = canUseNativeClipBridge();

  const canShareFiles = () => {
    if (typeof navigator === "undefined" || !navigator.canShare) return false;
    try {
      const file = new File([result.blob], filename, { type: result.blob.type });
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    setMessage(null);
    setBusy("share");
    setProgress(0);
    try {
      if (hasNativeBridge) {
        // The shell opens X directly with the clip + this caption in the share
        // intent. X drops intent text when a video is attached, so we also copy
        // the caption for a one-tap paste in the composer.
        try {
          await navigator.clipboard?.writeText(SHARE_CAPTION);
        } catch {
          /* clipboard blocked — non-fatal */
        }
        await sendClipToNative({
          blob: result.blob,
          filename,
          action: "share",
          caption: SHARE_CAPTION,
          onProgress: setProgress,
        });
      } else {
        const file = new File([result.blob], filename, {
          type: result.blob.type,
        });
        await navigator.share({
          files: [file],
          title: "MonkeGram",
          text: SHARE_CAPTION,
        });
      }
    } catch (error) {
      // AbortError means the user closed the share sheet; that is not a failure.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessage(
          error instanceof Error ? error.message : "Could not share this clip."
        );
      }
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setMessage(null);
    if (hasNativeBridge) {
      setBusy("save");
      setProgress(0);
      try {
        await sendClipToNative({
          blob: result.blob,
          filename,
          action: "save",
          onProgress: setProgress,
        });
        setMessage("SAVED TO YOUR VIDEO LIBRARY");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not save this clip."
        );
      } finally {
        setBusy(null);
      }
      return;
    }

    // iOS Safari ignores the download attribute — open in a new tab and
    // tell the user to long-press to save.
    if (isIOS) {
      window.open(result.url, "_blank");
      setShowIOSHint(true);
      return;
    }
    const a = document.createElement("a");
    a.href = result.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const shareSupported = hasNativeBridge || canShareFiles();
  const transferPercent = Math.round(progress * 100);

  return (
    <div className="w-full flex flex-col gap-3">
      {shareSupported && (
        <PixelButton
          onClick={handleShare}
          size="lg"
          disabled={busy !== null}
          className="w-full min-h-16 flex items-center justify-center gap-3"
        >
          {busy === "share" ? (
            <LoaderCircle size={18} strokeWidth={3} className="animate-spin" />
          ) : (
            <span
              aria-hidden
              className="font-sans text-2xl leading-none font-black"
            >
              𝕏
            </span>
          )}
          {busy === "share" ? `PREPARING · ${transferPercent}%` : "POST TO X"}
        </PixelButton>
      )}
      <PixelButton
        onClick={handleDownload}
        variant={shareSupported ? "ghost" : "primary"}
        size="md"
        disabled={busy !== null}
        className="w-full flex items-center justify-center gap-2"
      >
        {busy === "save" ? (
          <LoaderCircle size={16} strokeWidth={3} className="animate-spin" />
        ) : (
          <Download size={16} strokeWidth={3} />
        )}
        {busy === "save"
          ? `SAVING · ${transferPercent}%`
          : hasNativeBridge
            ? "SAVE TO DEVICE"
            : "DOWNLOAD"}
      </PixelButton>

      {shareSupported && !busy && (
        <p className="font-[family-name:var(--font-body)] text-cream/45 text-base text-center leading-snug">
          {hasNativeBridge
            ? "Opens X with your clip attached. Caption (@MonkeDAO #monkegram) is copied — just paste it into the post."
            : "Choose X in the share sheet. Caption (@MonkeDAO #monkegram) is copied — just paste it."}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="font-[family-name:var(--font-display)] text-banana text-[9px] text-center leading-relaxed"
        >
          {message}
        </p>
      )}

      {showIOSHint && (
        <p className="font-[family-name:var(--font-body)] text-banana text-lg text-center leading-snug">
          LONG-PRESS THE VIDEO → &quot;SAVE TO FILES&quot;
        </p>
      )}
    </div>
  );
}
