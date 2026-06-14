/** Minimal normalized landmark (MediaPipe returns x,y in 0..1). */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/** Key FaceMesh landmark indices for the mask bounding box. */
export const FACE_LANDMARKS = {
  leftEar: 127,
  rightEar: 356,
  forehead: 10,
  chin: 152,
} as const;

export interface Box {
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * Compute the square destination box for the (square) NFT image so it frames
 * the user's whole head like a mask.
 *
 * Uses ear-to-ear width and forehead-to-chin height to find the face center
 * and scale, then fits a padded square around it. `sizeOffset` (-0.2..0.3)
 * lets the user fine-tune.
 */
export function computeFaceBox(
  landmarks: Landmark[],
  canvasW: number,
  canvasH: number,
  sizeOffset: number
): Box | null {
  const L = landmarks[FACE_LANDMARKS.leftEar];
  const R = landmarks[FACE_LANDMARKS.rightEar];
  const T = landmarks[FACE_LANDMARKS.forehead];
  const B = landmarks[FACE_LANDMARKS.chin];
  if (!L || !R || !T || !B) return null;

  const faceW = Math.abs(R.x - L.x) * canvasW;
  const faceH = Math.abs(B.y - T.y) * canvasH;
  const cx = ((L.x + R.x) / 2) * canvasW;
  const cy = ((T.y + B.y) / 2) * canvasH;

  // Pad the square to cover the whole head (hair, ears, jaw).
  const base = Math.max(faceW, faceH);
  const size = base * (1.7 + sizeOffset);

  // Nudge slightly upward so the PFP's own face sits over the user's face.
  const yShift = size * 0.06;

  return {
    dx: cx - size / 2,
    dy: cy - size / 2 - yShift,
    dw: size,
    dh: size,
  };
}
