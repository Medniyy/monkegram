"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CameraOff, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useCameraStream } from "./useCameraStream";
import { useFaceMesh } from "./useFaceMesh";
import { useNFTImage } from "./useNFTImage";
import { FaceMaskCanvas } from "./FaceMaskCanvas";
import { MaskControls } from "./MaskControls";
import { RecordButton } from "./RecordButton";
import { useMediaRecorder } from "@/components/recorder/useMediaRecorder";
import { VideoPreview } from "@/components/recorder/VideoPreview";
import { DownloadButton } from "@/components/recorder/DownloadButton";
import { PixelButton } from "@/components/ui/PixelButton";
import { BlinkingCursor } from "@/components/ui/BlinkingCursor";

export function RecordView() {
  const selectedNFT = useAppStore((s) => s.selectedNFT);

  const { videoRef, status: camStatus, retry } = useCameraStream();
  const { landmarkerRef, status: meshStatus } = useFaceMesh();
  const { image: nftImage, status: imgStatus } = useNFTImage(selectedNFT?.image);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isRecording, elapsed, result, supported, start, stop, reset } =
    useMediaRecorder(canvasRef);

  const [faceDetected, setFaceDetected] = useState(false);

  // No monkey chosen — send the user to find one.
  if (!selectedNFT) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-cream text-sm leading-relaxed">
          NO MONKE SELECTED
        </p>
        <Link href="/">
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

  return (
    <div className="max-w-5xl mx-auto md:flex md:gap-8 md:justify-center md:items-start p-4 md:p-8">
      {/* Stage */}
      <div className="relative w-full md:w-[380px] shrink-0 aspect-[9/16] max-h-[68vh] md:max-h-none mx-auto bg-grid pixel-border overflow-hidden">
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

        {/* Back button */}
        <Link
          href="/"
          className="absolute top-2 left-2 z-30 p-2 bg-screen/80 border-[2px] border-cream text-cream"
          aria-label="Back"
        >
          <ArrowLeft size={18} strokeWidth={3} />
        </Link>

        {/* Selected monkey chip */}
        <div className="absolute top-2 right-2 z-30 px-2 py-1 bg-screen/80 border-[2px] border-banana">
          <span className="font-[family-name:var(--font-display)] text-banana text-[9px]">
            {selectedNFT.name}
          </span>
        </div>

        {/* Overlays */}
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

        {showNoFace && (
          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center pointer-events-none">
            <span className="blink font-[family-name:var(--font-display)] text-pixelred text-[10px] bg-screen/80 px-3 py-2 border-[2px] border-pixelred">
              [ NO FACE DETECTED ]
            </span>
          </div>
        )}
      </div>

      {/* Controls column */}
      <div className="mt-6 md:mt-0 md:w-72 flex flex-col gap-6">
        {result ? (
          <>
            <p className="font-[family-name:var(--font-display)] text-jungle text-xs text-center md:text-left">
              GOT IT.
            </p>
            <DownloadButton result={result} nft={selectedNFT} />
            <PixelButton variant="ghost" size="md" onClick={reset}>
              RECORD AGAIN
            </PixelButton>
          </>
        ) : !supported ? (
          <p className="font-[family-name:var(--font-display)] text-pixelred text-[11px] leading-relaxed text-center">
            [ RECORDING NOT SUPPORTED ]
            <br />
            <span className="text-cream/60 text-lg font-[family-name:var(--font-body)]">
              Try Chrome on Android or desktop.
            </span>
          </p>
        ) : (
          <>
            <MaskControls />
            <div className="flex justify-center md:justify-start">
              <RecordButton
                isRecording={isRecording}
                elapsed={elapsed}
                disabled={camStatus !== "ready" || meshStatus !== "ready"}
                onStart={start}
                onStop={stop}
              />
            </div>
          </>
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
