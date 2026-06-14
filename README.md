# MonkeGram 🐵

Find your Solana Monkey Business PFP, wear it as a live face mask, record a clip, download it.
**No wallet. No login. No data stored. $0 to run.**

A fully static site — face tracking, compositing, recording, and download all happen
in the browser. See [MONKEGRAM_DOCS.md](./MONKEGRAM_DOCS.md) for the full spec.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

> Camera + recording require `https://` or `http://localhost`. `localhost` is treated
> as secure, so local dev works out of the box.

The first run uses **placeholder images** so you can test the whole flow immediately.
See "Loading the real collection" below to swap in the real monkeys.

## How it works

| Concern | Approach |
|---|---|
| NFT data | Static JSON in `public/data/{gen2,gen3}.json` — fetched once, cached in memory. No API at runtime. |
| Images | Loaded directly from the collection's CDN (Shadow Drive / IPFS). |
| Face tracking | MediaPipe Face Landmarker (WASM), self-hosted under `public/mediapipe`. |
| Compositing | HTML Canvas 2D — camera frame + NFT image fitted to the face box. |
| Recording | `MediaRecorder` on `canvas.captureStream()`, 60s max, WebM (or MP4 on Safari). |
| Hosting | Static export (`output: "export"`) → any static host. Cloudflare Pages recommended (free). |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Static export to `out/` (runs `prebuild` → vendors MediaPipe) |
| `npm run setup:mediapipe` | Copies WASM + downloads the face model into `public/mediapipe` |
| `npm run data:sample` | (Re)generates placeholder `public/data/*.json` (5000 each) |
| `npm run data:fetch` | Fetches the **real** collection metadata (needs config — see below) |

## Loading the real collection

The verified on-chain collection mints are already baked into the fetch script,
so the **only** thing you need is a free Helius key:

| Collection | Verified on-chain collection mint |
|---|---|
| SMB Gen2 | `SMBtHCCC6RYRutFEPb4gZqeBLUZbMNhRKaMKZZLHi7W` |
| SMB Gen3 | `8Rt3Ayqth4DAiPnW9MDFi63TiQJHmohfTWLMQFHi4KZH` |

1. Get a free API key at <https://dev.helius.xyz>.
2. Create `.env.local` (see `.env.local.example`):
   ```env
   HELIUS_API_KEY=your_key
   ```
3. Install the TS runner and fetch:
   ```bash
   npm i -D tsx
   npm run data:fetch
   ```
   This overwrites `public/data/gen2.json` and `gen3.json` with real image URLs,
   and prints each collection's actual id range.
4. Commit the JSON. The deployed app never calls Helius again — it only reads the static files.

> Note: Gen2 ids run ~1–5000, but **Gen3 ids run into 5 digits** (e.g. #11696).
> The search has no hard cap — any id that exists in the data resolves.

## Deploy (free)

```bash
npm run build        # produces ./out
```

Point **Cloudflare Pages** (or Netlify / GitHub Pages / any static host) at the `out/`
directory. Build command `npm run build`, output directory `out`. Done — $0/month.

## Project layout

```
app/            routes: / (find) and /record (AR recorder)
components/     ui, layout, search, gallery, ar, recorder
lib/            nftData, mediapipe, imageUtils, recentlyViewed, types
store/          zustand app state (selected NFT + mask settings)
scripts/        one-time: setup-mediapipe, gen-sample-data, fetch-metadata
public/data/    collection JSON     public/mediapipe/  WASM + model
```
