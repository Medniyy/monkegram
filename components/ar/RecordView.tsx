"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CameraOff, Search, Settings, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useCameraStream } from "./useCameraStream";
import { useFaceMesh } from "./useFaceMesh";
import { useNFTImage } from "./useNFTImage";
import { useCutoutImage } from "./useCutoutImage";
import { FaceMaskCanvas } from "./FaceMaskCanvas";
import { MaskSettings, MaskQuickToggles } from "./MaskControls";
import { RecordButton } from "./RecordButton";
import { useMediaRecorder } from "@/components/recorder/useMediaRecorder";
import { VideoPreview } from "@/components/recorder/VideoPreview";
import { DownloadButton } from "@/components/recorder/DownloadButton";
import { PixelButton } from "@/components/ui/PixelButton";
import { BlinkingCursor } from "@/components/ui/BlinkingCursor";

export function RecordView() {
  const selectedNFT = useAppStore((s) => s.selectedNFT);
  const removeBg = useAppStore((s) => s.mask.removeBg);

  const { videoRef, status: camStatus, retry } = useCameraStream();
  const { landmarkerRef, status: meshStatus } = useFaceMesh();
  const { image: rawImage, status: imgStatus } = useNFTImage(selectedNFT?.image);
  const nftImage = useCutoutImage(rawImage, removeBg);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isRecording, elapsed, result, supported, start, stop, reset } =
    useMediaRecorder(canvasRef);

  const [faceDetected, setFaceDetected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // No monkey chosen — send the user to find one.
  if (!selectedNFT) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-cream text-sm leading-relaxed">
          NO MONKE SELECTED
        </p>
        <Link href="/find">
          <PixelButton size="lg" className="flex items-center gap-2">
            <Search size={16} strokeWidth={3} />
            FIND YOUR MONKE
          </PixelButton>
        </Link>
      </div>
    );
  }

  const engineLoading = meshStatus === "loading" || camStatus === "requesting";
  const showNoFace =
    camStatus === "ready" &&
    meshStatus === "ready" &&
    !faceDetected &&
    !result &&
    !isRecording;
  const showControls = !result && supported;

  return (
    <div className="min-h-dvh bg-screen flex items-center justify-center md:p-6">
      {/* Full-screen camera stage with overlay controls (camera-app style) */}
      <div className="relative w-full h-dvh md:h-auto md:w-[420px] md:aspect-[9/16] md:max-h-[88vh] bg-grid overflow-hidden md:pixel-border">
        {/* Hidden source video (kept rendered so it keeps decoding) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        />

        {/* Live composite */}
        {!result && (
          <FaceMaskCanvas
            videoRef={videoRef}
            landmarkerRef={landmarkerRef}
            canvasRef={canvasRef}
            nftImage={nftImage}
            onFaceChange={setFaceDetected}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Recorded playback */}
        {result && <VideoPreview url={result.url} />}

        {/* Top bar: back · monke name · gear */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/find"
            className="p-2 rounded-full bg-screen/55 border-[2px] border-cream/40 text-cream backdrop-blur-sm"
            aria-label="Back"
          >
            <ArrowLeft size={18} strokeWidth={3} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded bg-screen/55 border-[2px] border-banana/70 backdrop-blur-sm font-[family-name:var(--font-display)] text-banana text-[9px]">
              {selectedNFT.name}
            </span>
            {showControls && !isRecording && (
              <button
                onClick={() => setSettingsOpen(true)}
                aria-label="Mask settings"
                className="p-2 rounded-full bg-screen/55 border-[2px] border-cream/40 text-cream backdrop-blur-sm active:scale-95"
              >
                <Settings size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* Quick toggles — overlaid on the right, hidden while recording */}
        {showControls && !isRecording && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
            <MaskQuickToggles />
          </div>
        )}

        {/* No-face hint, sitting above the record button */}
        {showNoFace && (
          <div className="absolute inset-x-0 bottom-32 z-20 flex justify-center pointer-events-none">
            <span className="blink font-[family-name:var(--font-display)] text-pixelred text-[10px] bg-screen/80 px-3 py-2 border-[2px] border-pixelred">
              [ NO FACE DETECTED ]
            </span>
          </div>
        )}

        {/* Record button — overlaid bottom-center */}
        {showControls && (
          <div className="absolute bottom-8 inset-x-0 z-30 flex justify-center pb-[env(safe-area-inset-bottom)]">
            <RecordButton
              isRecording={isRecording}
              elapsed={elapsed}
              disabled={camStatus !== "ready" || meshStatus !== "ready"}
              onStart={start}
              onStop={stop}
            />
          </div>
        )}

        {/* Loading / permission / error overlays */}
        {engineLoading && (
          <StageOverlay>
            <BlinkingCursor label="LOADING FACE ENGINE" className="text-xs" />
          </StageOverlay>
        )}

        {camStatus === "denied" && (
          <StageOverlay>
            <CameraOff size={36} className="text-pixelred mb-3" />
            <p className="font-[family-name:var(--font-display)] text-pixelred text-[11px] leading-relaxed mb-4">
              CAMERA BLOCKED
            </p>
            <p className="text-cream/70 text-lg mb-4">
              Allow camera access to wear your monkey.
            </p>
            <PixelButton size="sm" onClick={retry}>
              TRY AGAIN
            </PixelButton>
          </StageOverlay>
        )}

        {(camStatus === "unsupported" || camStatus === "error") && (
          <StageOverlay>
            <CameraOff size={36} className="text-pixelred mb-3" />
            <p className="font-[family-name:var(--font-display)] text-pixelred text-[11px] leading-relaxed">
              CAMERA UNAVAILABLE
            </p>
          </StageOverlay>
        )}

        {meshStatus === "error" && (
          <StageOverlay>
            <p className="font-[family-name:var(--font-display)] text-pixelred text-[11px] leading-relaxed">
              FACE ENGINE FAILED TO LOAD
            </p>
          </StageOverlay>
        )}

        {imgStatus === "error" && (
          <StageOverlay>
            <p className="font-[family-name:var(--font-display)] text-pixelred text-[11px] leading-relaxed">
              MONKE IMAGE FAILED TO LOAD
            </p>
          </StageOverlay>
        )}

        {!result && !supported && (
          <StageOverlay>
            <p className="font-[family-name:var(--font-display)] text-pixelred text-[11px] leading-relaxed text-center">
              [ RECORDING NOT SUPPORTED ]
            </p>
            <p className="text-cream/60 text-lg mt-3">
              Try Chrome on Android or desktop.
            </p>
          </StageOverlay>
        )}

        {/* Post-record: preview + share, overlaid at the bottom */}
        {result && (
          <div className="absolute bottom-0 inset-x-0 z-30 bg-screen/92 backdrop-blur-sm border-t-[3px] border-banana p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
            <p className="font-[family-name:var(--font-display)] text-banana text-xs text-center">
              YOUR MONKEGRAM IS READY
            </p>
            <DownloadButton result={result} nft={selectedNFT} />
            <PixelButton variant="ghost" size="md" onClick={reset}>
              RECORD AGAIN
            </PixelButton>
          </div>
        )}

        {/* Settings sheet (gear) — opacity / size / quality */}
        {settingsOpen && !result && (
          <div className="absolute inset-0 z-40 flex items-end">
            <button
              className="absolute inset-0 bg-screen/60"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
            />
            <div className="relative w-full bg-screen border-t-[3px] border-banana p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between mb-4">
                <span className="font-[family-name:var(--font-display)] text-banana text-xs">
                  MASK SETTINGS
                </span>
                <button
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close"
                  className="text-cream active:scale-95"
                >
                  <X size={18} strokeWidth={3} />
                </button>
              </div>
              <MaskSettings />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StageOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-20 bg-screen/85 flex flex-col items-center justify-center text-center px-6">
      {children}
    </div>
  );
}
