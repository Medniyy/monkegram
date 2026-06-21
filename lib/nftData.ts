import type { Collection, CollectionData, NFT } from "./types";
import { BASE_PATH } from "./basePath";

/**
 * Runtime NFT data access.
 *
 * Primary path: MonkeAPI (https://github.com/Medniyy/MonkeAPI) — an O(1)
 * lookup by token number that returns one token's metadata plus a CORS-safe,
 * canvas-clean image URL (`/img/...`). This replaces downloading the entire
 * 0.5–1 MB collection JSON just to read one entry.
 *
 * Fallback path: the static /public/data/{collection}.json shipped with the
 * export, fetched lazily (once) and cached in memory. Used when the API is
 * unset, unreachable, or errors — so a temporary API outage never breaks the
 * static app's lookups. No API key, no cost.
 *
 * Background removal stays on-device (see lib/removeBackground.ts); the API's
 * optional `cutout` field is intentionally ignored to keep the app zero-backend
 * and free of image-storage cost.
 */

/** Base URL of MonkeAPI, or "" to use the static JSON only. Baked at build. */
const MONKE_API = (process.env.NEXT_PUBLIC_MONKE_API_URL ?? "").replace(
  /\/+$/,
  ""
);

const cache = new Map<Collection, CollectionData>();
const inflight = new Map<Collection, Promise<CollectionData>>();

async function loadCollection(collection: Collection): Promise<CollectionData> {
  const cached = cache.get(collection);
  if (cached) return cached;

  const existing = inflight.get(collection);
  if (existing) return existing;

  const promise = fetch(`${BASE_PATH}/data/${collection}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${collection} data`);
      return res.json() as Promise<CollectionData>;
    })
    .then((data) => {
      cache.set(collection, data);
      inflight.delete(collection);
      return data;
    })
    .catch((err) => {
      inflight.delete(collection);
      throw err;
    });

  inflight.set(collection, promise);
  return promise;
}

/**
 * Warm the cache (call on collection focus / toggle for instant search).
 * No-op when the API is in use — there's no full collection to prefetch.
 */
export function preloadCollection(collection: Collection): void {
  if (MONKE_API) return;
  void loadCollection(collection).catch(() => {});
}

/**
 * arweave.net (where Gen2 art lives) returns 403 on some networks/regions.
 * permagate.io is an ar.io gateway that serves the same Arweave tx with
 * permissive CORS (ACAO:*), so it stays canvas-safe for recording. Gen3 art is
 * on irys (gateway.irys.xyz) and loads fine, so only arweave.net is rewritten.
 *
 * Only used on the static-fallback path; API image URLs are already proxied
 * through MonkeAPI's canvas-safe /img route.
 */
export function resilientImage(url: string): string {
  return url.replace(/^https:\/\/arweave\.net\//, "https://permagate.io/");
}

interface ApiToken {
  id: number;
  collection: Collection;
  name: string;
  image: string;
  cutout: string | null;
}

/**
 * Look up a single token via the API (O(1)). Returns:
 *  - an NFT on 200
 *  - null on a definitive 404 (id doesn't exist) — do NOT fall back
 *  - undefined on any other failure (network/5xx) — caller should fall back
 */
async function getNFTFromApi(
  collection: Collection,
  id: number
): Promise<NFT | null | undefined> {
  try {
    const res = await fetch(`${MONKE_API}/v1/${collection}/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) return undefined;
    const token = (await res.json()) as ApiToken;
    // API image is already a CORS-safe proxy URL — no resilientImage needed.
    return { id, collection, name: token.name, image: token.image };
  } catch {
    return undefined; // network error — let the caller fall back
  }
}

async function getNFTFromStatic(
  collection: Collection,
  id: number
): Promise<NFT | null> {
  const data = await loadCollection(collection);
  const record = data[String(id)];
  if (!record) return null;
  return { id, collection, name: record.name, image: resilientImage(record.image) };
}

/** Look up a single token. Returns null if the id doesn't exist. */
export async function getNFT(
  collection: Collection,
  id: number
): Promise<NFT | null> {
  if (MONKE_API) {
    const fromApi = await getNFTFromApi(collection, id);
    if (fromApi !== undefined) return fromApi; // 200 or definitive 404
    // otherwise the API was unreachable — fall through to static data
  }
  return getNFTFromStatic(collection, id);
}

/** How many tokens the collection actually has (for grids). */
export async function getCollectionSize(
  collection: Collection
): Promise<number> {
  if (MONKE_API) {
    try {
      const res = await fetch(`${MONKE_API}/v1/${collection}`);
      if (res.ok) {
        const stats = (await res.json()) as { count: number };
        if (typeof stats.count === "number") return stats.count;
      }
    } catch {
      // fall through to static
    }
  }
  const data = await loadCollection(collection);
  return Object.keys(data).length;
}

/** Resolve several ids at once (used by the recently-viewed grid). */
export async function getNFTs(
  refs: { collection: Collection; id: number }[]
): Promise<NFT[]> {
  const resolved = await Promise.all(
    refs.map((ref) => getNFT(ref.collection, ref.id).catch(() => null))
  );
  return resolved.filter((nft): nft is NFT => nft !== null);
}
