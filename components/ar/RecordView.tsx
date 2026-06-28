"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CameraOff,
  MicOff,
  Search,
  Settings,
  SwitchCamera,
  X,
} from "lucide-react";
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
import { PhotoEditor } from "@/components/photo/PhotoEditor";
import { captureFrame, type CapturedPhoto, type PhotoResult } from "@/lib/photo";

export function RecordView() {
  const selectedNFT = useAppStore((s) => s.selectedNFT);
  const removeBg = useAppStore((s) => s.mask.removeBg);
  const flip = useAppStore((s) => s.mask.flip);
  const captureMode = useAppStore((s) => s.captureMode);
  const setCaptureMode = useAppStore((s) => s.setCaptureMode);
  const cameraFacing = useAppStore((s) => s.cameraFacing);
  const setCameraFacing = useAppStore((s) => s.setCameraFacing);

  const { videoRef, status: camStatus, retry, audioStatus, audioTrackRef } =
    useCameraStream();
  const { landmarkerRef, status: meshStatus } = useFaceMesh();
  const { image: rawImage, status: imgStatus } = useNFTImage(selectedNFT?.image);
  const nftImage = useCutoutImage(rawImage, removeBg);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { isRecording, elapsed, result, supported, start, stop, reset } =
    useMediaRecorder(canvasRef, audioTrackRef);

  const [faceDetected, setFaceDetected] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null);

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

  const isPhoto = captureMode === "photo";
  // Photo mode always shows a clean, untouched preview — the live AR overlay is
  // VIDEO-only. You take a normal photo, then place monkes in the editor (the
  // chosen monke starts pre-placed; ADD MONKE for more). No face detection.
  const liveNft = isPhoto ? null : nftImage;

  const engineLoading = meshStatus === "loading" || camStatus === "requesting";
  const inEditor = !!captured && !photoResult;
  const anyResult = !!result || !!photoResult;
  const showNoFace =
    camStatus === "ready" &&
    meshStatus === "ready" &&
    !isPhoto &&
    !faceDetected &&
    !anyResult &&
    !isRecording;
  const showControls = !anyResult && !inEditor && supported;

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const shot = captureFrame(video, flip);
    if (shot) setCaptured(shot);
  };

  const retakePhoto = () => {
    if (photoResult) URL.revokeObjectURL(photoResult.url);
    setPhotoResult(null);
    setCaptured(null);
  };

  return (
    <div className="min-h-dvh bg-screen flex items-center justify-center desktop:p-6">
      {/* Full-screen camera stage with overlay controls (camera-app style).
          Mobile: portrait, edge-to-edge (object-cover fills the phone). Desktop:
          a large landscape frame at the camera's native aspect so you see the
          WHOLE frame you're capturing (object-contain), not a cropped 9:16 slice. */}
      <div className="relative w-full h-dvh desktop:h-[82vh] desktop:w-auto desktop:aspect-video desktop:max-w-[94vw] bg-grid overflow-hidden desktop:pixel-border">
        {/* Hidden source video (kept rendered so it keeps decoding) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
        />

        {/* Live composite (hidden while editing or showing a result) */}
        {!anyResult && !inEditor && (
          <FaceMaskCanvas
            videoRef={videoRef}
            landmarkerRef={landmarkerRef}
            canvasRef={canvasRef}
            nftImage={liveNft}
            onFaceChange={setFaceDetected}
            className="absolute inset-0 w-full h-full object-cover desktop:object-contain"
          />
        )}

        {/* Photo editor */}
        {inEditor && captured && (
          <PhotoEditor
            photo={captured}
            initialNFT={selectedNFT}
            onDone={(r) => {
              setPhotoResult(r);
              setCaptured(null);
            }}
            onRetake={() => setCaptured(null)}
          />
        )}

        {/* Recorded playback */}
        {result && <VideoPreview url={result.url} />}
        {/* Photo result preview */}
        {photoResult && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoResult.url}
            alt="Your MonkeGram"
            className="absolute inset-0 w-full h-full object-contain bg-screen"
          />
        )}

        {/* Top bar: back · monke name · gear */}
        {!inEditor && (
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
        )}

        {/* Quick toggles — overlaid on the right, hidden while recording */}
        {showControls && !isRecording && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
            <MaskQuickToggles micBlocked={audioStatus === "denied"} />
            {isPhoto && (
              <button
                onClick={() =>
                  setCameraFacing(
                    cameraFacing === "user" ? "environment" : "user"
                  )
                }
                aria-label="Flip camera"
                title="Flip camera"
                className="w-11 h-11 rounded-full border-[2px] border-cream/40 bg-screen/55 text-cream flex items-center justify-center backdrop-blur-sm active:scale-95"
              >
                <SwitchCamera size={20} strokeWidth={2.5} />
              </button>
            )}
          </div>
        )}

        {/* Mic-blocked banner (non-blocking) */}
        {showControls && audioStatus === "denied" && (
          <div className="absolute inset-x-0 top-16 z-30 flex justify-center px-4">
            <button
              onClick={retry}
              className="flex items-center gap-2 bg-screen/85 border-[2px] border-pixelred px-3 py-2 backdrop-blur-sm active:scale-95"
            >
              <MicOff size={14} className="text-pixelred" />
              <span className="font-[family-name:var(--font-display)] text-pixelred text-[8px] leading-tight text-left">
                MIC BLOCKED — TAP TO ALLOW (RECORDS SILENT)
              </span>
            </button>
          </div>
        )}

        {/* No-face hint, sitting above the record button */}
        {showNoFace && (
          <div className="absolute inset-x-0 bottom-40 z-20 flex justify-center pointer-events-none">
            <span className="blink font-[family-name:var(--font-display)] text-pixelred text-[10px] bg-screen/80 px-3 py-2 border-[2px] border-pixelred">
              [ NO FACE DETECTED ]
            </span>
          </div>
        )}

        {/* Mode toggles + shutter — pinned to the very bottom so they don't ride
            up over the subject's face (acute in landscape, where the frame is
            short). Tighter spacing in landscape to reclaim vertical room. */}
        {showControls && (
          <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col items-center gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] landscape:gap-1.5 landscape:pb-[max(0.4rem,env(safe-area-inset-bottom))]">
            {!isRecording && (
              <Segmented
                options={[
                  { value: "video", label: "VIDEO" },
                  { value: "photo", label: "PHOTO" },
                ]}
                value={captureMode}
                onChange={(v) => setCaptureMode(v as "video" | "photo")}
              />
            )}

            {isPhoto ? (
              <PhotoShutter
                onClick={takePhoto}
                disabled={camStatus !== "ready"}
              />
            ) : (
              <RecordButton
                isRecording={isRecording}
                elapsed={elapsed}
                disabled={camStatus !== "ready" || meshStatus !== "ready"}
                onStart={start}
                onStop={stop}
              />
            )}
          </div>
        )}

        {/* Loading / permission / error overlays */}
        {engineLoading && !inEditor && (
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

        {!anyResult && !inEditor && !supported && (
          <StageOverlay>
            <p className="font-[family-name:var(--font-display)] text-pixelred text-[11px] leading-relaxed text-center">
              [ RECORDING NOT SUPPORTED ]
            </p>
            <p className="text-cream/60 text-lg mt-3">
              Try Chrome on Android or desktop.
            </p>
          </StageOverlay>
        )}

        {/* Post-capture: preview + share, overlaid at the bottom */}
        {anyResult && (
          <div className="absolute bottom-0 inset-x-0 z-30 bg-screen/92 backdrop-blur-sm border-t-[3px] border-banana p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-3">
            <p className="font-[family-name:var(--font-display)] text-banana text-xs text-center">
              YOUR MONKEGRAM IS READY
            </p>
            <DownloadButton
              result={photoResult ?? result!}
              nft={selectedNFT}
            />
            <PixelButton
              variant="ghost"
              size="md"
              onClick={photoResult ? retakePhoto : reset}
            >
              {photoResult ? "TAKE ANOTHER" : "RECORD AGAIN"}
            </PixelButton>
          </div>
        )}

        {/* Settings sheet (gear) — opacity / size / quality */}
        {settingsOpen && !anyResult && !inEditor && (
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

/** Pill segmented control used for the VIDEO/PHOTO switch. */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-screen/55 border-[2px] border-cream/40 backdrop-blur-sm overflow-hidden">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`font-[family-name:var(--font-display)] text-[9px] px-4 py-1.5 transition-colors ${
              active ? "bg-banana text-screen" : "text-cream/70"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Single-tap camera shutter (photo mode). */
function PhotoShutter({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Take photo"
      className="w-20 h-20 rounded-full border-[4px] border-cream flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
    >
      <span className="w-14 h-14 rounded-full bg-cream" />
    </button>
  );
}
