"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { PixelButton } from "@/components/ui/PixelButton";
import type { NFT } from "@/lib/types";
import type { RecordingResult } from "./useMediaRecorder";

interface DownloadButtonProps {
  result: RecordingResult;
  nft: NFT | null;
}

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
  const filename = buildFilename(nft, result.ext);

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
    const file = new File([result.blob], filename, { type: result.blob.type });
    try {
      await navigator.share({ files: [file], title: "MonkeGram" });
    } catch {
      /* user cancelled — no-op */
    }
  };

  const handleDownload = () => {
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

  return (
    <div className="w-full flex flex-col gap-2">
      {canShareFiles() && (
        <PixelButton
          onClick={handleShare}
          size="lg"
          className="w-full flex items-center justify-center gap-2"
        >
          <Share2 size={16} strokeWidth={3} />
          SHARE
        </PixelButton>
      )}
      <PixelButton
        onClick={handleDownload}
        variant={canShareFiles() ? "secondary" : "primary"}
        size="lg"
        className="w-full flex items-center justify-center gap-2"
      >
        <Download size={16} strokeWidth={3} />
        DOWNLOAD
      </PixelButton>

      {showIOSHint && (
        <p className="font-[family-name:var(--font-body)] text-banana text-lg text-center leading-snug">
          LONG-PRESS THE VIDEO → &quot;SAVE TO FILES&quot;
        </p>
      )}
    </div>
  );
}
