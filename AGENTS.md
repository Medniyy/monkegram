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
dApp Store; it loads THIS web app in a full-screen WebView after a wallet +
NFT-ownership gate, and injects the holder's owned monkeys via
`window.__MONKEGRAM_OWNED__` (see `lib/bridge.ts`, `isInAppShell()`). When running
"in shell", `/find` shows "YOUR MONKES" instead of the number search. Read
`../monkegram-mobile/AGENTS.md` for the full picture and the run/resume recipe.

**Routes:** `/` welcome + stories tutorial → `/find` (finder, or YOUR MONKES in
shell) → `/record` (camera/AR/record). **Key code:** `components/ar/*` (mask
engine), `lib/removeBackground.ts` + `components/ar/useCutoutImage.ts` (PFP
background cutout), `components/recorder/useMediaRecorder.ts` (quality presets),
`store/useAppStore.ts`, `components/onboarding/StoryTutorial.tsx` (context-aware
web vs app copy), `lib/bridge.ts` (shell bridge), `lib/nftData.ts` (Arweave/Irys
data; `resilientImage` rewrites arweave.net→permagate.io).

**Post-record priority:** hand the completed clip to Android's share sheet for
posting to X. Saving to the device/video library is the secondary action.

**Full spec + recent changes:** `MONKEGRAM_DOCS.md` (see its "Updates since MVP").

**Run:** `npm run dev` → `http://localhost:3000/monkegram/` (basePath defaults to
`/monkegram` from `next.config.ts`; the Pages deploy workflow sets
`NEXT_PUBLIC_BASE_PATH=/monkegram` explicitly). `npm run build` → static `out/`.
