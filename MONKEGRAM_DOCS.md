# MonkeGram — Project Documentation

> *Solana Monkey Business face-mask recorder. Find your monkey, wear it, record it.*

---

## 1. Original MVP Brief (superseded by the Seeker app)

> This section records the original browser MVP. The current product is one
> Seeker mobile app; see “Updates since MVP” for the active product model.

The original MonkeGram MVP was a web experience for Solana Monkey Business NFT holders (SMB Gen2 & SMB Gen3). Users:

1. Open the website — no wallet, no login, no account
2. Type their token number, pick Gen2 or Gen3
3. Their monkey PFP appears as a real-time face mask via camera
4. Record a video clip (up to 60 seconds)
5. Download the clip directly to their device

**Core principles:**
- Zero running cost — no server, no database, no API subscriptions
- Zero data stored — nothing is sent anywhere, everything stays on the user's device
- Zero friction — one URL, open, use, done

---

## 2. Collections

| Collection | Magic Eden Slug | Supply |
|---|---|---|
| SMB Gen2 | `solana_monkey_business` | 5,000 |
| SMB Gen3 | `smb_gen3` | 5,000 |

### Image & Metadata Strategy — Static JSON (no runtime API)

All NFT images already live on public CDNs (Shadow Drive / IPFS) paid for by the SMB project. They are free to read forever. We exploit this fully.

**The approach:**

Run `scripts/fetch-metadata.ts` **once, locally**, before deploying. It reads all 10,000 token metadata records and writes two static JSON files into `public/data/`. These JSON files ship with the app and are the only data source at runtime — no API key, no network call to a blockchain node, no cost.

```
public/data/
  gen2.json     # ~600 KB gzipped — { "1": { "image": "...", "name": "SMB #1" }, ... }
  gen3.json     # ~600 KB gzipped
```

**At runtime:** user types `42` → browser reads local `gen2.json` (already loaded, in memory) → gets image URL → `<img crossOrigin="anonymous" src={url}>` → renders in under 100 ms.

**No Helius API key. No RPC calls. No IndexedDB. No proxy. Nothing.**

The script is run once by the developer before each deploy. If the collection never changes (it won't — both are finished), it never needs to run again.

### JSON schema (minimal, intentional)

```ts
// public/data/gen2.json and gen3.json
type CollectionData = {
  [tokenId: string]: {
    image: string   // canonical URL: Shadow Drive or IPFS via Cloudflare gateway
    name: string    // e.g. "SMB #42"
  }
}
```

Attributes (fur, eyes, accessories) are omitted from MVP — the search is by number only, and the face mask doesn't need trait data. Add attributes to the JSON in v2 if you add trait filtering.

### Image CORS

Shadow Drive serves `Access-Control-Allow-Origin: *` — canvas `drawImage` works fine.
For any IPFS URLs, normalize to `https://cloudflare-ipfs.com/ipfs/{CID}/{file}` in the fetch script — Cloudflare's IPFS gateway also sends CORS headers.

### One-time fetch script

`scripts/fetch-metadata.ts` uses a **free public Solana RPC** (no key needed for read-only metadata):

```
Public endpoints (free, no key):
  https://api.mainnet-beta.solana.com     (Solana Foundation)
  https://mainnet.helius-rpc.com          (Helius — free tier, 100 req/s)
```

The script only runs locally on the developer's machine. The deployed app has zero dependency on any RPC.

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14** (`output: 'export'`) | Generates pure static HTML/CSS/JS — no server needed, zero hosting cost |
| Styling | **Tailwind CSS + custom CSS** | Utility-first, PS1 custom classes layered on top |
| Face tracking | **MediaPipe Face Mesh (WASM)** | 468 landmarks, 30+ fps on mobile, runs entirely in browser |
| Canvas compositing | **HTML Canvas 2D API** | Sufficient for 2D mask overlay; no WebGL complexity |
| Video recording | **MediaRecorder API** | Native browser API, no library needed |
| NFT data | **Static JSON files** (`public/data/`) | Zero cost, zero latency, zero dependency |
| State | **Zustand** | Minimal, no boilerplate |
| Fonts | **Press Start 2P + VT323** (Google Fonts) | PS1 / pixel aesthetic |
| Icons | **Lucide React** | Lightweight SVG icons |
| Animations | **Framer Motion** | Page transitions, mask entrance effects |
| Hosting | **Cloudflare Pages** | Free forever, global CDN, no bandwidth caps for static sites |

**What is deliberately NOT in this stack:**
- No backend (no Next.js API routes, no Express, no serverless functions)
- No database (no Supabase, no Firebase, no Postgres)
- No authentication (no wallet adapter, no NextAuth)
- No analytics (no Mixpanel, no GA — add in v2 if needed)
- No environment variables at runtime (`.env.local` is only for the one-time dev script)

---

## 4. Design System

### Visual Direction

**"Instagram meets a PS1 memory card"**

| Dimension | Decision |
|---|---|
| Layout structure | Instagram: grid browsing, bottom nav (mobile), sidebar (desktop) |
| Texture | CRT scanlines overlay, pixel dithering on card borders, film grain on backgrounds |
| Typography | `Press Start 2P` — headings, labels, buttons. `VT323` — body copy, numbers (large and readable) |
| Motion | Screen flicker on load, pixelated wipe transitions between views, blinking `█` cursor on loading states |
| Feel | Chunky. Intentional. Every border is 2–4 px. No soft shadows. No smooth gradients. No glassmorphism. |

### Color Palette

Pulled directly from the SMB Gen2 and Gen3 visual language:

```css
--banana-yellow:  #F5C842;   /* primary CTA, highlights */
--jungle-green:   #2D6A4F;   /* secondary, success states */
--pixel-blue:     #1A3A5C;   /* deep navy, page backgrounds */
--monkey-brown:   #7B4F2E;   /* warm accent, borders */
--cream-white:    #F0EAD6;   /* body text on dark backgrounds */
--pixel-red:      #C0392B;   /* errors, recording indicator */
--screen-black:   #0A0A0A;   /* true black, scanline base */
--grid-gray:      #1E1E1E;   /* card backgrounds */
```

### Responsive Strategy

Breakpoint: `< 768px` = mobile, `≥ 768px` = desktop. No tablet in-between for MVP.

| Feature | Mobile | Desktop |
|---|---|---|
| Navigation | Bottom tab bar (4 tabs, thumb-zone) | Left sidebar (icons + labels, collapsible) |
| NFT grid | 2 columns, swipe-to-scroll | 4 columns, hover states with pixel border glow |
| Search | Full-screen overlay, large custom numpad (0–9) | Inline search in sidebar, keyboard-first |
| Camera / mask view | Full-screen portrait, 9:16 | Centered 9:16 panel with controls on right |
| Record button | Fixed bottom-center, reachable by thumb | Right panel below mask controls |
| Download | Bottom sheet modal | Inline button + filename preview |

---

## 5. Feature Specifications

### 5.1 NFT Search

- **Input:** token number (1–5000) + collection toggle (Gen2 / Gen3)
- **Lookup:** instant — reads pre-loaded in-memory JSON, no async call
- **Display:** NFT image + name, single "Use this monkey →" CTA
- **Invalid number:** inline pixel-red error, no toast
- **Mobile UX:** custom pixel numpad (no system keyboard), large keys, backspace key
- **Desktop UX:** standard text input, autofocus on load, Enter to confirm

### 5.2 Browse / Gallery

- Grid of the 12 most recently viewed tokens (stored in `localStorage`, not a server)
- Static "featured" seed list (hand-picked 20 popular tokens) shown when no history
- Virtual list via `@tanstack/react-virtual` — renders only visible cards, handles 5k tokens without lag
- Tap/click a card → NFT detail sheet → "Use this monkey" CTA

### 5.3 Face Mask AR

**Rendering pipeline:**
```
getUserMedia (camera)
  → video element (hidden)
    → MediaPipe FaceMesh WASM
      → 468 face landmarks @ 30 fps
        → Canvas 2D draw loop
            1. Draw camera frame
            2. Compute face bounding box from landmarks
            3. Draw NFT image scaled + positioned to face bbox
            4. Apply globalAlpha (opacity) + globalCompositeOperation (blend mode)
          → Canvas element displayed to user
            → captureStream(30) → MediaRecorder (when recording)
```

**Mask fit:** NFT image maps to the face bounding box defined by:
- Left bound: landmark `127` (left ear)
- Right bound: landmark `356` (right ear)
- Top bound: landmark `10` (forehead top)
- Bottom bound: landmark `152` (chin)

Affine 2D scale + translate only — no 3D head pose for MVP. The result is a flat PFP that tracks the face position and scale.

**User controls:**
- Opacity slider: 0–100% (default 90%)
- Size offset: −20% to +30% of auto-fit (default 0%)
- Flip horizontal toggle (for selfie cam mirror correction)
- Blend mode: Normal / Multiply / Screen

**No-face state:** blinking `[ NO FACE DETECTED ]` message in pixel-red, camera feed still visible.

### 5.4 Video Recording

- **Source:** `canvas.captureStream(30)` + optional mic audio (`getUserMedia` audio track, user toggle)
- **Codec priority:** `video/webm;codecs=vp9` → `video/webm;codecs=vp8` → `video/mp4` (Safari iOS 14.3+)
- **Max duration:** 60 seconds, hard-enforced by `setTimeout` stopping the recorder
- **UI:** pulsing pixel-red ring around record button during recording, countdown timer (`00:59` → `00:00`)
- **On stop:** `Blob` → `URL.createObjectURL` → autoplay preview + download button

### 5.5 Download

- `<a href={blobUrl} download="monkegram_gen2_0042_20260614.webm">` — single tap/click
- **iOS Safari fallback:** if `download` attribute is blocked (iOS < 16), open blob in new tab + show overlay: `"LONG PRESS THE VIDEO → SAVE TO FILES"`
- **Web Share API** (mobile Chrome/Safari): `navigator.share({ files: [videoFile] })` as secondary option — try before falling back to download link

---

## 6. File Structure

```
monkegram/
├── app/                              # Next.js App Router (static export)
│   ├── page.tsx                      # Home: search + recent grid
│   ├── record/page.tsx               # AR recorder view
│   └── layout.tsx                    # AppShell, fonts, CRT overlay
├── components/
│   ├── ui/                           # Base design system
│   │   ├── PixelButton.tsx
│   │   ├── PixelCard.tsx
│   │   ├── PixelInput.tsx
│   │   ├── CRTOverlay.tsx            # Scanline + flicker effect
│   │   └── BlinkingCursor.tsx
│   ├── search/
│   │   ├── SearchBar.tsx             # Desktop search input
│   │   ├── NumberPad.tsx             # Mobile numpad (0–9 + backspace)
│   │   └── NFTPreviewCard.tsx        # Image + name + CTA
│   ├── gallery/
│   │   ├── NFTGrid.tsx               # Virtual list grid
│   │   └── NFTCard.tsx               # Thumbnail card
│   ├── ar/
│   │   ├── FaceMaskCanvas.tsx        # Main AR canvas component
│   │   ├── useFaceMesh.ts            # MediaPipe hook → landmarks[]
│   │   ├── useCameraStream.ts        # getUserMedia hook
│   │   ├── MaskControls.tsx          # Opacity, size, flip, blend
│   │   └── RecordButton.tsx          # Record/stop + countdown
│   ├── recorder/
│   │   ├── useMediaRecorder.ts       # MediaRecorder hook
│   │   ├── VideoPreview.tsx          # Looping blob playback
│   │   └── DownloadButton.tsx        # Download + iOS fallback
│   └── layout/
│       ├── MobileNav.tsx             # Bottom tab bar
│       ├── DesktopSidebar.tsx        # Left sidebar
│       └── AppShell.tsx              # Responsive layout switcher
├── lib/
│   ├── nftData.ts                    # Loads gen2.json / gen3.json, lookup by id
│   ├── imageUtils.ts                 # Canvas draw helpers (bbox calc, affine)
│   ├── mediapipe.ts                  # Dynamic import + init for FaceMesh WASM
│   └── recentlyViewed.ts             # localStorage read/write (max 12 items)
├── store/
│   └── useAppStore.ts                # Zustand: selectedNFT, recordingState, maskSettings
├── scripts/
│   └── fetch-metadata.ts             # ONE-TIME script: fetches all metadata → writes public/data/*.json
├── public/
│   ├── data/
│   │   ├── gen2.json                 # { "1": { image, name }, ... } — committed to repo
│   │   └── gen3.json
│   └── fonts/                        # Self-hosted fallback for Press Start 2P, VT323
├── styles/
│   ├── globals.css                   # Tailwind base + CSS custom properties
│   └── pixel.css                     # CRT, dither, scanline, flicker keyframes
└── next.config.ts                    # output: 'export' — generates pure static site
```

**No `app/api/` directory. No `.env.local` required to run the app. No server.**

---

## 7. Task Breakdown

Ordered by dependency. Each task is independently shippable.

### Phase D — Design (before any code, using `/frontend-design` skill)

Design the key screens as working HTML/CSS prototypes using the `/frontend-design` skill. These become the visual reference for all build phases. No Figma needed — output is code.

Screens to design (each as a separate task):

- [ ] **D01** — Home / Search screen — mobile version: dark background, blinking cursor in search area, custom numpad, 2-col NFT grid below, bottom tab nav
- [ ] **D02** — Home / Search screen — desktop version: left sidebar with search + collection toggle, 4-col NFT grid, hover states
- [ ] **D03** — NFT Preview Card — both sizes (mobile sheet, desktop side panel): monkey image, name, "USE THIS MONKEY →" CTA
- [ ] **D04** — Recorder view — mobile: full-screen camera feed with monkey mask overlay, opacity/size controls as a bottom drawer, record button fixed at bottom-center
- [ ] **D05** — Recorder view — desktop: 9:16 camera panel centered, controls in right panel (sliders, blend mode, flip toggle), record button below
- [ ] **D06** — Recording in-progress state: pulsing pixel-red ring, countdown timer `00:59 → 00:00`
- [ ] **D07** — Post-record state: video preview (looping), download button, "RECORD AGAIN" secondary action
- [ ] **D08** — Error / edge case states: no camera permission, no face detected, unsupported browser

Each design task uses the PS1 palette, `Press Start 2P` + `VT323` fonts, CRT scanline overlay, and chunky pixel borders defined in Section 4. Designs are approved before Phase 1 begins.

---

### Phase 0 — One-time Setup (developer machine only, before building)

- [ ] **T00** — Run `scripts/fetch-metadata.ts` against public Solana RPC to generate `public/data/gen2.json` and `public/data/gen3.json`. Commit both files to the repo. This is the only time blockchain is touched.

### Phase 1 — Foundation (Day 1)

- [ ] **T01** — Scaffold Next.js 14 project: TypeScript, Tailwind, ESLint, `output: 'export'` in `next.config.ts`
- [ ] **T02** — Install dependencies: `zustand`, `framer-motion`, `@mediapipe/face_mesh`, `lucide-react`, `@tanstack/react-virtual`
- [ ] **T03** — Add fonts: Press Start 2P + VT323 via `next/font/google`
- [ ] **T04** — Define CSS custom properties (color palette, pixel sizing scale) in `globals.css`
- [ ] **T05** — Build `CRTOverlay` — fixed `::before` pseudo-element, scanline `repeating-linear-gradient`, CSS `@keyframes flicker`
- [ ] **T06** — Build `PixelButton`, `PixelCard`, `PixelInput` base components
- [ ] **T07** — Build `AppShell` — renders `MobileNav` (bottom tabs) below `768px`, `DesktopSidebar` at or above

### Phase 2 — NFT Data & Search (Day 1–2)

- [ ] **T08** — Write `lib/nftData.ts` — imports `gen2.json` and `gen3.json` statically, exports `getNFT(collection, id)` returning `{ image, name } | null`. Instant, synchronous.
- [ ] **T09** — Write `lib/recentlyViewed.ts` — read/write to `localStorage`, max 12 items, keyed by `gen2:42`
- [ ] **T10** — Build `CollectionToggle` — Gen2 / Gen3 pill switcher, pixel-styled
- [ ] **T11** — Build `NumberPad` (mobile) — 0–9 grid + backspace, large tap targets, pixel border
- [ ] **T12** — Build `SearchBar` (desktop) — text input, autofocus, validates 1–5000 range
- [ ] **T13** — Build `NFTPreviewCard` — image, name, "USE THIS MONKEY →" CTA button
- [ ] **T14** — Wire search flow on home page: input → `getNFT()` → show preview card → CTA navigates to `/record`
- [ ] **T15** — Build `NFTGrid` + `NFTCard` — virtual list, reads from `recentlyViewed` + static featured seed

### Phase 3 — AR Face Mask (Day 2–3)

- [ ] **T16** — Write `useCameraStream.ts` — `getUserMedia({ video: { facingMode: 'user' } })`, returns stream + permission error state
- [ ] **T17** — Write `lib/mediapipe.ts` — dynamic import of `@mediapipe/face_mesh`, lazy init on first use, exposes `initFaceMesh(videoEl, onResults)`
- [ ] **T18** — Write `useFaceMesh.ts` — calls mediapipe init, returns `landmarks: NormalizedLandmarkList | null` updated at 30 fps
- [ ] **T19** — Build `FaceMaskCanvas.tsx` — `requestAnimationFrame` loop: draw video frame, compute face bbox from landmarks, draw NFT image to bbox
- [ ] **T20** — Implement bbox calculation in `lib/imageUtils.ts` using landmarks 127, 356, 10, 152. Apply size offset. Handle padding.
- [ ] **T21** — Build `MaskControls` — opacity slider (range input), size offset slider, flip toggle, blend mode select; all wired to Zustand store
- [ ] **T22** — No-face state: when `landmarks === null`, render blinking `[ NO FACE DETECTED ]` over camera feed
- [ ] **T23** — Performance pass: profile on Chrome DevTools. Target 30 fps on Pixel 6 / iPhone 12. Reduce canvas resolution to `720p` if needed.

### Phase 4 — Recording & Download (Day 3)

- [ ] **T24** — Write `useMediaRecorder.ts` — `canvas.captureStream(30)`, codec detection (`vp9 → vp8 → mp4`), 60 s max via `setTimeout`, returns `{ start, stop, blob, isRecording }`
- [ ] **T25** — Build `RecordButton` — idle / recording / processing states, pulsing red ring via CSS animation, countdown timer display
- [ ] **T26** — Build `VideoPreview` — autoplay + loop on `blob` received, pixel border frame
- [ ] **T27** — Build `DownloadButton` — `<a download>` with filename `monkegram_gen2_0042_20260614.webm`, iOS fallback (new tab + long-press instruction overlay)
- [ ] **T28** — Wire full record page: camera → mask → record → preview → download, all in one screen

### Phase 5 — Polish & QA (Day 4)

- [ ] **T29** — Page transitions: Framer Motion `AnimatePresence`, pixelated `clip-path` wipe (top → bottom, 200 ms)
- [ ] **T30** — Loading state for MediaPipe init: pixel progress bar with `LOADING FACE ENGINE...` text
- [ ] **T31** — Error states: permission denied (camera), unsupported browser (recording), image load fail — each has a distinct pixel-art message
- [ ] **T32** — `<head>` meta tags: OG image (static monkey graphic), title, description, `theme-color: #0A0A0A`
- [ ] **T33** — Keyboard navigation (desktop): Tab through controls, Space to record/stop, Escape to go back
- [ ] **T34** — QA matrix: iPhone 14 Safari, Pixel 7 Chrome, Samsung Galaxy Chrome, MacBook Chrome 1440p, Windows Chrome 1080p

### Phase 6 — Metadata Fetch Script (run before T00, documented separately)

- [ ] **T35** — `scripts/fetch-metadata.ts`: iterates token IDs 1–5000 for each collection, fetches metadata from public Solana RPC in batches of 100, extracts `image` + `name`, normalizes IPFS URLs to Cloudflare gateway, writes `public/data/gen2.json` and `gen3.json`
- [ ] **T36** — Add retry logic (3x) and rate limiting (100 ms delay between batches) to the fetch script so it handles RPC throttling without crashing

---

## 8. Running Costs: $0.00

| Resource | Cost |
|---|---|
| Cloudflare Pages hosting | Free (unlimited bandwidth for static sites) |
| NFT images | Free (served from Shadow Drive / IPFS — SMB project pays for this) |
| Metadata JSON | Free (bundled in repo, served as static files) |
| Face tracking (MediaPipe) | Free (runs in user's browser, Apache 2.0 license) |
| Video recording | Free (native browser API) |
| Video storage | Free (never stored — exists only in user's browser memory until download) |
| User data | None collected, nothing to pay for |

The one-time metadata fetch script hits a free public RPC for ~10 minutes. That's it.

---

## 9. Key Technical Notes

### Static export constraint
`output: 'export'` in `next.config.ts` means no `getServerSideProps`, no API routes, no middleware. All data must be static or client-side. This is intentional — it enforces the zero-cost constraint and makes the app fully portable.

### MediaPipe WASM loading
The MediaPipe FaceMesh WASM bundle is ~8 MB. Use `next/dynamic` with `{ ssr: false }` to load `FaceMaskCanvas` only when the record page mounts. Show the pixel loading bar during init. Once loaded, it's cached by the browser — subsequent visits are instant.

### Canvas → MediaRecorder pipeline
`HTMLCanvasElement.captureStream(30)` returns a `MediaStream`. This stream is passed to `new MediaRecorder(stream)`. **The canvas `requestAnimationFrame` loop must keep running during recording** — if it pauses, the video records still frames. Merge the mic audio track (if enabled) with `addTrack()` before creating the recorder.

### iOS Safari recording (critical)
iOS Safari does not support `video/webm`. Check `MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')` first. If true (iOS 14.3+), use MP4. If neither WebM nor MP4 is supported (rare, old iOS), show: `[ RECORDING NOT SUPPORTED ] TRY CHROME ON ANDROID`.

### JSON import performance
Both JSON files are imported statically via ES import (`import gen2 from '@/public/data/gen2.json'`). Next.js tree-shakes and includes them in the JS bundle. At ~600 KB each gzipped, they load in the initial page parse and are instantly in memory — lookup is O(1), zero async overhead.

Alternatively, fetch them lazily on first search if bundle size matters. Measure first.

### localStorage for recently viewed
No expiry needed. Max 12 items enforced in `recentlyViewed.ts`. Never store image data — only token IDs (`"gen2:42"`). Image URLs come from the JSON on each render.

### Face landmark reference
MediaPipe returns normalized coordinates (0.0–1.0). Map to canvas pixels:
```ts
const x = landmark.x * canvas.width
const y = landmark.y * canvas.height
```
Key landmarks for mask bounding box:
- `127` — left cheek / ear edge
- `356` — right cheek / ear edge
- `10`  — top of forehead
- `152` — bottom of chin

---

## 10. Definition of Done (MVP)

- [ ] User opens site, types a number, sees their SMB NFT — in under 2 seconds on a good connection
- [ ] Face mask tracks their face in real time at 30 fps on Pixel 6 or iPhone 12
- [ ] User can adjust opacity and size of the mask
- [ ] User can record up to 60 seconds
- [ ] User can download the video (or save on iOS)
- [ ] Works on: Chrome desktop, Chrome Android, Safari iOS 14.3+
- [ ] No wallet, no login, no data stored, no API calls at runtime
- [ ] Running cost to developer: $0

---

## 11. Out of Scope for MVP (v2 ideas)

- Wallet-gated holder verification
- Trait-based search / filtering
- Social feed or shareable link
- Audio / music overlay on video
- GIF or image export
- 3D head pose (current: flat 2D bbox warp)
- Multi-face detection
- On-chain minting of recorded clip
- Analytics / usage tracking

---

## Updates since MVP (2026-06-18)

Features added after the original spec above. The stack is unchanged (Next.js 16
static export, React 19, Tailwind v4, Zustand, MediaPipe Tasks Vision); these are
additive.

### Routing / entry
- **Welcome screen** at `/` (`app/page.tsx`): minimal opener — MG logo, **ENTER**
  → `/find`, and **HOW IT WORKS** to replay the tutorial. `AppShell` renders no
  sidebar/nav on `/` (full-bleed).
- The finder ("FIND YOUR MONKE" + numpad/search) moved from `/` to **`/find`**
  (`app/find/page.tsx`). `/record` unchanged. Nav/links updated accordingly.
- **Stories tutorial** (`components/onboarding/StoryTutorial.tsx`): IG-stories
  style (segmented auto-advancing bars, tap to scrub, hold to pause), auto-plays
  on first visit (localStorage `monkegram:onboarded`). **Context-aware**: in the
  native app (shell) the first slide is "VERIFY YOUR MONKE / connect your wallet
  and verify ownership"; on the web it's "FIND YOUR MONKE / type your number".
  Share slide says "Tag @MonkeDAO".

### PFP background removal (the "wear just the monkey" feature)
- `lib/removeBackground.ts` — a **zero-dependency chroma-key**: samples the four
  corners for the flat PFP background colour, then **flood-fills inward from the
  edges** (so it only clears background connected to the border — never punches
  holes through matching fur), feathers the edge, and **crops to the subject's
  bounding box** so the monkey fills the face (returns `null` → caller keeps the
  original when corners disagree / busy background). Chosen over an ML model
  (`@imgly`, ~40MB) for the mobile WebView.
- `components/ar/useCutoutImage.ts` applies it and returns an `<img>` (canvas →
  dataURL, stays CORS-safe for recording). Toggled by `mask.removeBg` (default on)
  via the **CUT BG** scissors button in `MaskControls`. Runs only in the recorder,
  on the PFP — never the camera video.

### Recording quality
- Camera requested at 1080p (`useCameraStream`). `useMediaRecorder` now applies the
  selected preset's `videoBitsPerSecond` (SD/HD/FULL = 2.5/6/12 Mbps) + 128 kbps
  audio, and captures mic at 48 kHz stereo. Default quality **FULL**; a
  **QUALITY** SD/HD/FULL picker added to `MaskControls`.

### Mobile shell bridge
- `lib/bridge.ts` — `useBridgedOwned()` / `isInAppShell()` / `resolveBridged()`.
  When loaded inside the MonkeGram Android app's WebView, the native shell injects
  `window.__MONKEGRAM_OWNED__` (the wallet's verified-owned monkeys); `/find` then
  shows "YOUR MONKES" instead of the number search. See the `monkegram-mobile`
  repo's `docs/07` and `docs/09`.

### Product model + post-record priority
- **MonkeGram is one Seeker mobile app.** This Next.js static bundle is its
  embedded post-auth experience/AR engine, not a separate web product.
- The primary completed-recording action is **POST TO X**. In the Android shell,
  the clip is streamed locally to native code and opened in the system share
  sheet with the video attached. **SAVE TO DEVICE** is the secondary action and
  writes the clip to the video library. No upload backend is involved.

### Branding
- `components/ui/BrandLogo.tsx` + `mglogo.png`; palette retuned to Dark Monke Green
  `#0C2A18` + Banana Gold `#FEC133` (token values in `app/globals.css`).

*Last updated: 2026-06-18*
