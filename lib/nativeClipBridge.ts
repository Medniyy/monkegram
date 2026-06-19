"use client";

export type NativeClipAction = "share" | "save";

interface NativeWebViewBridge {
  postMessage: (message: string) => void;
}

interface BridgeReply {
  transferId: string;
  type: "ready" | "ack" | "success" | "error";
  index?: number;
  message?: string;
}

interface SendClipOptions {
  blob: Blob;
  filename: string;
  action: NativeClipAction;
  /** Caption text the shell attaches to the X share intent (share action only). */
  caption?: string;
  onProgress?: (progress: number) => void;
}

const BRIDGE_EVENT = "monkegram-clip-bridge";
const CHUNK_BYTES = 384 * 1024;
const CHUNK_TIMEOUT_MS = 30_000;
const ACTION_TIMEOUT_MS = 5 * 60_000;

function nativeBridge(): NativeWebViewBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = window.ReactNativeWebView as NativeWebViewBridge | undefined;
  return typeof bridge?.postMessage === "function" ? bridge : null;
}

export function canUseNativeClipBridge(): boolean {
  return nativeBridge() !== null;
}

function makeTransferId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const batch = 0x8000;
  for (let i = 0; i < bytes.length; i += batch) {
    binary += String.fromCharCode(...bytes.subarray(i, i + batch));
  }
  return btoa(binary);
}

function waitForReply(
  transferId: string,
  match: (reply: BridgeReply) => boolean,
  timeoutMs: number
): Promise<BridgeReply> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener(BRIDGE_EVENT, onReply as EventListener);
      reject(new Error("The phone took too long to process the video."));
    }, timeoutMs);

    const onReply = (event: Event) => {
      const reply = (event as CustomEvent<BridgeReply>).detail;
      if (!reply || reply.transferId !== transferId || !match(reply)) return;
      window.clearTimeout(timeout);
      window.removeEventListener(BRIDGE_EVENT, onReply as EventListener);
      if (reply.type === "error") {
        reject(new Error(reply.message || "The phone could not process the video."));
      } else {
        resolve(reply);
      }
    };

    window.addEventListener(BRIDGE_EVENT, onReply as EventListener);
  });
}

function post(message: object): void {
  const bridge = nativeBridge();
  if (!bridge) throw new Error("Native video sharing is unavailable.");
  bridge.postMessage(JSON.stringify({ __monkegramClip: true, ...message }));
}

/**
 * Streams a recorded Blob to the native Seeker shell in acknowledged chunks.
 * Chunk acknowledgements deliberately trade a little speed for stability: a
 * 60-second FULL recording is too large to push through WebView postMessage in
 * one giant base64 string without risking an out-of-memory crash.
 */
export async function sendClipToNative({
  blob,
  filename,
  action,
  caption,
  onProgress,
}: SendClipOptions): Promise<void> {
  const transferId = makeTransferId();
  const totalChunks = Math.ceil(blob.size / CHUNK_BYTES);

  const ready = waitForReply(
    transferId,
    (reply) => reply.type === "ready" || reply.type === "error",
    CHUNK_TIMEOUT_MS
  );
  post({
    type: "start",
    transferId,
    action,
    filename,
    caption,
    mimeType: blob.type,
    totalBytes: blob.size,
    totalChunks,
  });
  await ready;
  onProgress?.(0);

  try {
    for (let index = 0; index < totalChunks; index++) {
      const start = index * CHUNK_BYTES;
      const bytes = new Uint8Array(
        await blob.slice(start, start + CHUNK_BYTES).arrayBuffer()
      );
      const ack = waitForReply(
        transferId,
        (reply) =>
          reply.type === "error" ||
          (reply.type === "ack" && reply.index === index),
        CHUNK_TIMEOUT_MS
      );
      post({
        type: "chunk",
        transferId,
        index,
        data: bytesToBase64(bytes),
      });
      await ack;
      onProgress?.((index + 1) / totalChunks);
    }

    const completed = waitForReply(
      transferId,
      (reply) => reply.type === "success" || reply.type === "error",
      ACTION_TIMEOUT_MS
    );
    post({ type: "finish", transferId });
    await completed;
  } catch (error) {
    try {
      post({ type: "cancel", transferId });
    } catch {
      /* the bridge may already be gone */
    }
    throw error;
  }
}
