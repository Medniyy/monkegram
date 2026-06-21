# MonkeGram — Release & Store Submission Guide

The end-to-end, battle-tested process for shipping a MonkeGram update: deploy the
web app, build + sign the Android APK, and submit it to the Solana Mobile (Seeker)
dApp Store. Follow top to bottom. Every gotcha here was hit and solved at least once.

> **Two repos, one app.** `MonkeyFace` (this repo) = the Next.js web experience,
> hosted at **https://ath.camera/monkegram/**. `../monkegram-mobile` = the
> Expo/React-Native shell that wraps that URL in a WebView and ships to the store
> as **`camera.ath.monkegram`**. Most fixes are web-only and need **no APK**.

---

## 0. Decide what kind of change you made

| Change is in… | Ships via | Store review? |
|---|---|---|
| `MonkeyFace/` (recorder, finder, watch page, copy, masks, share UI) | **Web deploy** to gh-pages | **No** — live in ~1 min, the WebView picks it up |
| `monkegram-mobile/` (wallet, permissions, native share/save, app.json, version) | **New signed APK** + Portal upload | **Yes** — 3–5 day review |

If you only touched the web app, do **Section 1** and stop. If you touched native,
do Section 1 (if the web also changed) then Sections 2–4.

---

## 1. Deploy the web app (gh-pages)

There is no CI (the cached GitHub PAT lacks `workflow` scope), so we deploy the
static export to the `gh-pages` branch by hand.

```bash
# 1. Build the static export — PowerShell, NOT Git Bash.
#    (Git Bash mangles "/monkegram" → "C:/Program Files/Git/monkegram" via MSYS.)
#    In PowerShell:
#      $env:NEXT_PUBLIC_BASE_PATH="/monkegram"; npm run build      # → out/

# 2. Stage out/ into a throwaway dir and force-push it as gh-pages (Git Bash):
cd MonkeyFace
rm -rf .release-pages && mkdir .release-pages && cp -r out/. .release-pages/
cd .release-pages
git init -q && git checkout -q -b gh-pages && git add -A
git -c user.name="Claude Code" -c user.email="noreply@anthropic.com" \
    commit -q -m "Deploy: <what changed>"
git remote add origin https://github.com/Medniyy/monkegram.git
git push -f origin gh-pages
cd .. && rm -rf .release-pages    # PowerShell Remove-Item if Git Bash says "busy"
```

- **Author the deploy commit as the agent/tooling, never a fabricated human** — the
  auto-classifier blocks impersonation and the build artifacts have no real author.
- Pages serves the `gh-pages` branch root. The account-level custom domain
  `ath.camera` (on the `medniyy.github.io` user site) auto-serves project repos at
  `ath.camera/<repo>/`, so **no per-repo CNAME** is needed.
- **Verify** after ~1 min: every route should be `200`.
  ```bash
  for p in "" record/ find/ watch/ terms/ privacy/; do \
    curl -s -o /dev/null -w "$p %{http_code}\n" "https://ath.camera/monkegram/$p"; done
  ```
- To pull the new code into the **installed Seeker app**, just reopen it (the
  WebView re-fetches). No reinstall.

---

## 2. Build & sign the release APK

### 2a. Bump the version — ALWAYS, every build
Edit `monkegram-mobile/app.json`:
- `expo.version` → bump (e.g. `1.0.1` → `1.0.2`)
- `expo.android.versionCode` → **+1** (the store rejects an upload whose
  versionCode isn't higher than the last). History: v1.0.0 = code 1, v1.0.1 = code 2.

Also confirm `monkegram-mobile/.env` has `EXPO_PUBLIC_WEB_URL=https://ath.camera/monkegram/`
so the release WebView points at production (not localhost).

### 2b. Build from a space-free path (the ninja bug)
`react-native-quick-crypto`'s C++ build fails with `ninja: manifest 'build.ninja'
still dirty after 100 tries` whenever the project path contains spaces
("ATH Projects live"). A directory junction does **not** help (ninja canonicalizes
through it). Build from a genuinely space-free copy.

```powershell
# PowerShell (robocopy mangles flags under Git Bash; exit code <8 = success)
$src = "c:\Users\medni\Desktop\ATH Projects live\monkegram-mobile"
robocopy $src C:\dev\mg /E /XD "$src\android" "$src\.git" "$src\node_modules" "$src\.expo" .cxx
# node_modules excluded only if C:\dev\mg already has a matching one (no dep changes);
# otherwise drop that /XD entry so it copies, or run `npm install` in C:\dev\mg.

Set-Location C:\dev\mg
npx expo prebuild --clean -p android      # regenerates android/ from app.json + plugins
Set-Location C:\dev\mg\android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a   # ~5 min
```

- **Never `gradlew clean`** — it re-triggers the ninja C++ error. `prebuild --clean`
  is the safe way to get a fresh `android/`.
- Build **arm64-v8a only**. A full multi-ABI build fails on armeabi-v7a (same ninja
  bug). The Seeker and all modern devices are arm64.
- `prebuild --clean` re-applies app.json: package `camera.ath.monkegram`, scheme
  `monkegram`, icons/splash, the `blockedPermissions` strip, and the
  `withDappStoreSigning` + `withTwitterQueries` plugins.

### 2c. Signing
The release signing config is injected by `plugins/withDappStoreSigning.js`, which
reads `MG_RELEASE_*` from `android/gradle.properties` (sourced from
`credentials/keystore.properties`). Nothing to do if `credentials/` is present.

**🔑 The keystore is irreplaceable.** Every future update MUST be signed with
`monkegram-mobile/credentials/monkegram-dappstore.keystore` (alias `monkegram`,
store+key password `MonkeGramDappStore2026!`). Lose it = you can never update this
app, only republish as a brand-new listing. Back up the `.keystore` + password
offline. A duplicate lives at `C:\dev\mg\credentials\`.

### 2d. Verify + collect the APK
```powershell
$apk = "C:\dev\mg\android\app\build\outputs\apk\release\app-release.apk"
$bt  = "$env:ANDROID_HOME\build-tools\36.0.0"
& "$bt\apksigner.bat" verify -v $apk            # expect: Verifies, v2 scheme: true
& "$bt\aapt.exe" dump badging $apk | Select-String "versionCode|versionName|uses-permission"
Copy-Item $apk "C:\Users\medni\Desktop\MonkeGram-v<X.Y.Z>-release.apk" -Force
```
Required: **Verifies**, **v2 scheme true**, correct versionCode/Name, package
`camera.ath.monkegram`, and **no `SYSTEM_ALERT_WINDOW`** in the permission list.

---

## 3. Submit on the Publisher Portal

Web flow at **https://publish.solanamobile.com** (publisher KYB already approved).

1. Connect the **publisher wallet** — it holds the Publisher + App NFTs. Every
   future release must come from this **same wallet**; back up its seed phrase.
2. Open the existing **MonkeGram** app → **New Version / Release**.
3. Upload the signed APK (dApp Store takes an **APK**, not AAB). New versionCode.
4. Fill the release/"what's new" notes. Reviewer notes: wallet is **sign-in only**
   (MWA / Sign-In With Solana), **no token transfer**, no fund-bearing actions.
5. Approve the on-chain release (~0.2 SOL). Review takes ~3–5 days from
   `publishersupport@dappstore.solanamobile.com`.

Storage provider = R2 (portal-managed, free) is simplest. The Portal "Upload
Provider" stores the listing NFT metadata/assets — separate from the web hosting.

---

## 4. Listing materials (already in `store-submission/`)

| Field | Value |
|---|---|
| Name / package | MonkeGram / `camera.ath.monkegram` |
| Subtitle | "Wear your monke. Record. Post to X." |
| Website | https://ath.camera/monkegram/ |
| Terms / Privacy | …/monkegram/terms/ · …/monkegram/privacy/ |
| Contact / support | athmedia21@gmail.com |
| Icon / banner / editor / previews | `icon-512x512.png`, `banner-1200x600.png`, `editors-choice-1200x1200.png`, `preview-01..04.png` |

Full field copy is in `store-submission/LISTING.md`. Assets are regenerated by
`scripts/generate-store-assets.py` (+ `scripts/capture-store-ui.mjs` for UI shots).

---

## 5. Pre-submit checklist

- [ ] Web deployed; all routes `200`; tested on the live URL.
- [ ] `app.json` versionCode **+1** and versionName bumped.
- [ ] `.env` `EXPO_PUBLIC_WEB_URL` = production URL.
- [ ] APK: `apksigner verify` → Verifies + v2 true; correct version; perms clean.
- [ ] Real device smoke test: wallet connect (+ recover on resume), record a full
      30s+ clip (no freeze), MP4 plays on iPhone, Save Video + Post to X both work.
- [ ] Keystore + publisher-wallet seed backed up offline.
- [ ] No secrets in either repo (`.env`/keystore gitignored & untracked).
