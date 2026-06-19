/**
 * The path the app is served under (e.g. "/monkegram" for ath.camera/monkegram).
 *
 * Next.js prefixes <Link>/router and bundled assets with basePath
 * automatically, but raw fetch() calls and string asset paths (the NFT data
 * JSON and the MediaPipe WASM/model) do NOT — so prepend BASE_PATH to those.
 *
 * Set NEXT_PUBLIC_BASE_PATH to "" to serve from the domain root instead.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
