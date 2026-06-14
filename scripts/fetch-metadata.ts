/**
 * fetch-metadata.ts — ONE-TIME, developer-machine-only script.
 *
 * Enumerates an entire SMB collection via the Helius DAS API (free tier,
 * no cost) and writes a compact lookup table to public/data/{collection}.json:
 *
 *     { "1": { "image": "https://...", "name": "SMB #1" }, ... }
 *
 * The deployed app NEVER calls this — it only reads the static JSON. Run this
 * locally before deploying, commit the JSON, and forget about it (both
 * collections are finished and never change).
 *
 * USAGE:
 *   1. Get a free Helius API key at https://dev.helius.xyz
 *   2. Create .env.local with:
 *        HELIUS_API_KEY=your_key
 *        GEN2_COLLECTION=<verified collection mint address for SMB Gen2>
 *        GEN3_COLLECTION=<verified collection mint address for SMB Gen3>
 *   3. Run:  npx tsx scripts/fetch-metadata.ts
 *
 * Find the collection mint addresses on the Magic Eden collection page
 * (the verified on-chain collection), or via Helius "getAssetsByGroup".
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// --- Config -----------------------------------------------------------------

const HELIUS_API_KEY = process.env.HELIUS_API_KEY ?? "";
const RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Verified on-chain Metaplex collection mints (confirmed by reading on-chain
// metadata for a sample token from each set). Override via env if ever needed.
const GEN2_COLLECTION = "SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W";
const GEN3_COLLECTION = "8Rt3Ayqth4DAiPnW9MDFi63TiQJHmohfTWLMQFHi4KZH";

const TARGETS: { name: "gen2" | "gen3"; collection: string }[] = [
  { name: "gen2", collection: process.env.GEN2_COLLECTION ?? GEN2_COLLECTION },
  { name: "gen3", collection: process.env.GEN3_COLLECTION ?? GEN3_COLLECTION },
];

const OUT_DIR = join(process.cwd(), "public", "data");
const PAGE_LIMIT = 1000;
const BATCH_DELAY_MS = 150;

// --- Helpers ----------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalise IPFS / Arweave URLs to a CORS-friendly gateway for canvas use. */
function normalizeImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("ipfs://")) {
    const cid = url.replace("ipfs://", "").replace(/^ipfs\//, "");
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  return url; // Shadow Drive / Arweave already send Access-Control-Allow-Origin: *
}

/** Pull the numeric token id out of a name like "SMB #1234" or "Gen3 #42". */
function parseTokenId(name: string): number | null {
  const m = name.match(/#\s*(\d+)/);
  if (m) return Number(m[1]);
  const trailing = name.match(/(\d+)\s*$/);
  return trailing ? Number(trailing[1]) : null;
}

type DasAsset = {
  content?: {
    metadata?: { name?: string };
    links?: { image?: string };
    files?: { uri?: string; cdn_uri?: string }[];
  };
};

async function fetchPage(collection: string, page: number) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "monkegram",
      method: "getAssetsByGroup",
      params: {
        groupKey: "collection",
        groupValue: collection,
        page,
        limit: PAGE_LIMIT,
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  const json = await res.json();
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result as { items: DasAsset[]; total: number };
}

async function fetchPageWithRetry(collection: string, page: number, tries = 3) {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fetchPage(collection, page);
    } catch (err) {
      lastErr = err;
      await sleep(500 * (i + 1));
    }
  }
  throw lastErr;
}

function imageOf(asset: DasAsset): string {
  const c = asset.content;
  return (
    c?.links?.image ??
    c?.files?.[0]?.cdn_uri ??
    c?.files?.[0]?.uri ??
    ""
  );
}

// --- Main -------------------------------------------------------------------

async function run() {
  if (!HELIUS_API_KEY) {
    console.error("Missing HELIUS_API_KEY. See script header for setup.");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const target of TARGETS) {
    if (!target.collection) {
      console.warn(
        `Skipping ${target.name}: no collection mint set ` +
          `(${target.name.toUpperCase()}_COLLECTION env var).`
      );
      continue;
    }

    console.log(`\nFetching ${target.name} (${target.collection})...`);
    const out: Record<string, { image: string; name: string }> = {};
    let page = 1;
    let fetched = 0;

    // DAS pagination: keep requesting pages until one comes back short
    // (the `total` field is per-page, not the grand total, so don't trust it).
    while (true) {
      const result = await fetchPageWithRetry(target.collection, page);
      const items = result.items;
      if (items.length === 0) break;

      for (const asset of items) {
        const name = asset.content?.metadata?.name ?? "";
        const id = parseTokenId(name);
        if (id == null) continue;
        out[String(id)] = {
          image: normalizeImageUrl(imageOf(asset)),
          name,
        };
      }

      fetched += items.length;
      console.log(`  page ${page}: +${items.length} (collected ${fetched})`);
      page++;
      await sleep(BATCH_DELAY_MS);

      if (items.length < PAGE_LIMIT) break;
    }

    const ids = Object.keys(out).map(Number);
    const file = join(OUT_DIR, `${target.name}.json`);
    await writeFile(file, JSON.stringify(out));
    console.log(
      `  wrote ${ids.length} tokens (id range ${Math.min(...ids)}..${Math.max(
        ...ids
      )}) -> public/data/${target.name}.json`
    );
  }

  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
