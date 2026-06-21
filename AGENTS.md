<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MonkeGram embedded experience — agent handoff

**Product framing:** MonkeGram is one Seeker mobile app for Solana Monkey
Business holders. This repo is its embedded Next.js experience and AR/recording
engine—not a separate user-facing web product. It is a static export (Next.js
16, `output: "export"`, basePath `/monkegram`) with no backend. Deployed to
GitHub Pages (`Medniyy/monkegram` repo) on the custom domain **`ath.camera`**, so
the live app is `https://ath.camera/monkegram/`.

**It is one implementation half of a two-repo app.** A sibling repo **`../monkegram-mobile`** (Expo
/ React Native) is the native Android shell shipping to the Solana Mobile (Seeker)
dApp Store; it loads THIS web app in a full-screen WebView after a **simple wallet
sign-in (MWA / Sign-In With Solana — no NFT-ownership gate; any connected wallet is
in)**. `lib/bridge.ts` (`isInAppShell()`) detects the shell; legacy owned-monkey
bridging (`window.__MONKEGRAM_OWNED__`) still exists but the live shell uses the
choose-by-number finder. Read `../monkegram-mobile/AGENTS.md` for the full picture
and the run/resume recipe.

**Routes:** `/` welcome + stories tutorial → `/find` (finder) → `/record`
(camera/AR/record); plus `/watch` (WMP-style demo/pitch player), `/terms`,
`/privacy`. **Key code:** `components/ar/*` (mask engine), `lib/removeBackground.ts`
+ `components/ar/useCutoutImage.ts` (PFP background cutout),
`components/recorder/useMediaRecorder.ts` (quality presets; **MP4-first**, 1s
timeslice + 30fps requestFrame pump — fixes the iOS Safari mid-clip video freeze),
`components/recorder/DownloadButton.tsx` (platform-aware share/save: Seeker native
bridge, mobile share-sheet, desktop X-web-intent; iOS "SAVE VIDEO" uses the share
sheet), `components/watch/MediaPlayer.tsx` (videos in `public/videos/`, transcoded
H.264 w/ faststart), `store/useAppStore.ts`, `components/onboarding/StoryTutorial.tsx`
(context-aware web vs app copy), `lib/bridge.ts` (shell bridge), `lib/nftData.ts`
(Arweave/Irys data; `resilientImage` rewrites arweave.net→permagate.io).

**Post-record priority:** hand the completed clip to Android's share sheet for
posting to X. Saving to the device/video library is the secondary action.

**Full spec + recent changes:** `MONKEGRAM_DOCS.md` (see its "Updates since MVP").
**Releasing an update:** `store-submission/RELEASE_GUIDE.md` (web deploy + signed
APK build + Portal submission, with every gotcha).

**Run:** `npm run dev` → `http://localhost:3000/monkegram/` (basePath defaults to
`/monkegram` from `next.config.ts`; the Pages deploy workflow sets
`NEXT_PUBLIC_BASE_PATH=/monkegram` explicitly). `npm run build` → static `out/`.
