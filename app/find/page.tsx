"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Collection, NFT } from "@/lib/types";
import { getNFT, getNFTs, preloadCollection } from "@/lib/nftData";
import { addRecent, getRecent } from "@/lib/recentlyViewed";
import { useBridgedOwned, useBridgedSelected, resolveBridged } from "@/lib/bridge";
import { useAppStore } from "@/store/useAppStore";
import { CollectionToggle } from "@/components/common/CollectionToggle";
import { SearchBar } from "@/components/search/SearchBar";
import { NumberPad } from "@/components/search/NumberPad";
import { NFTPreviewCard } from "@/components/search/NFTPreviewCard";
import { NFTGrid } from "@/components/gallery/NFTGrid";
import { BlinkingCursor } from "@/components/ui/BlinkingCursor";
import { BrandLogo } from "@/components/ui/BrandLogo";

type Status = "idle" | "loading" | "found" | "notfound";

export default function Home() {
  const router = useRouter();
  const setSelectedNFT = useAppStore((s) => s.setSelectedNFT);

  // Inside the native MonkeGram shell, the wallet's owned monkeys are bridged
  // in. In that case we show "YOUR MONKES" and hide the manual number search.
  const bridgedOwned = useBridgedOwned();
  const shellMode = bridgedOwned !== null;

  // If the user tapped a specific monkey in the native inventory, go straight to
  // the recorder wearing it (skip the in-web picker).
  const bridgedSelected = useBridgedSelected();
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (!bridgedSelected || jumpedRef.current) return;
    jumpedRef.current = true;
    (async () => {
      const [nft] = await resolveBridged([bridgedSelected]);
      if (nft) {
        setSelectedNFT(nft);
        router.push("/record");
      } else {
        jumpedRef.current = false; // resolution failed — let it retry
      }
    })();
  }, [bridgedSelected, setSelectedNFT, router]);

  const [collection, setCollection] = useState<Collection>("gen2");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<NFT | null>(null);

  const [gallery, setGallery] = useState<NFT[]>([]);
  const [galleryTitle, setGalleryTitle] = useState("RECENTLY WORN");
  const [galleryLoading, setGalleryLoading] = useState(true);

  // Gen2 and Gen3 number differently (Gen3 ids run into 5 digits), so we
  // don't hard-cap by a fixed supply — validity is decided by whether the id
  // exists in the loaded data. MAX_DIGITS just bounds the input length.
  const MAX_DIGITS = 6;

  // Warm the data cache as soon as a collection is in focus.
  useEffect(() => {
    preloadCollection(collection);
  }, [collection]);

  // Load the gallery once. In shell mode it's the wallet's owned monkeys;
  // otherwise recently-viewed only. There's no "featured" fallback — the grid
  // appears only once the user has actually worn a monke, so the finder stays a
  // single screen on first visit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (shellMode) {
        setGalleryTitle("YOUR MONKES");
        const nfts = await resolveBridged(bridgedOwned ?? []);
        if (!cancelled) {
          setGallery(nfts);
          setGalleryLoading(false);
        }
        return;
      }
      const recent = getRecent();
      if (recent.length === 0) {
        if (!cancelled) {
          setGallery([]);
          setGalleryLoading(false);
        }
        return;
      }
      setGalleryTitle("RECENTLY WORN");
      const nfts = await getNFTs(recent);
      if (!cancelled) {
        setGallery(nfts);
        setGalleryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shellMode, bridgedOwned]);

  // Searching is explicit (tap SEARCH / press Enter) — we don't query the API
  // for every intermediate value while the number is being typed (1 → 13 → 135),
  // which fired three lookups instead of one. Editing the number only clears any
  // shown result; it never hits the API. `searchSeq` invalidates a stale in-flight
  // search if the number changes (or a new search starts) before it resolves.
  const searchSeq = useRef(0);
  useEffect(() => {
    searchSeq.current += 1;
    setStatus("idle");
    setResult(null);
  }, [query, collection]);

  const runSearch = useCallback(async () => {
    const num = Number(query);
    if (!query || Number.isNaN(num) || num < 1) return;
    const seq = (searchSeq.current += 1);
    setStatus("loading");
    const nft = await getNFT(collection, num);
    if (seq !== searchSeq.current) return; // superseded by a newer edit/search
    if (nft) {
      setResult(nft);
      setStatus("found");
    } else {
      setResult(null);
      setStatus("notfound");
    }
  }, [query, collection]);

  // Used for both the number-search result and gallery taps. A gallery tap
  // already carries the full NFT, so wear it straight away (no extra search).
  const handleUse = useCallback(
    (nft: NFT) => {
      addRecent({ collection: nft.collection, id: nft.id });
      setSelectedNFT(nft);
      router.push("/record");
    },
    [router, setSelectedNFT]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-12 flex flex-col gap-5 md:gap-10">
      {/* Hero */}
      <header className="text-center md:text-left">
        {/* Logo — mobile only (desktop shows it in the sidebar). */}
        <BrandLogo size={56} className="md:hidden mx-auto mb-2" />
        <h1 className="font-[family-name:var(--font-display)] text-banana text-2xl md:text-4xl leading-tight">
          {shellMode ? "PICK YOUR MONKE" : "FIND YOUR MONKE"}
        </h1>
        <p className="hidden md:block text-cream/60 text-xl mt-2">
          {shellMode
            ? "Tap one you hold — or find any monke by number."
            : "Type your number. Wear it. Record it."}
        </p>
      </header>

      {/* "What's next?" teaser — desktop only; hidden on mobile to keep the
          finder a single screen. */}
      <div className="pixel-border-banana bg-grid px-4 py-3 hidden md:flex items-center gap-3">
        <span className="font-[family-name:var(--font-display)] text-banana text-[10px] shrink-0">
          WHAT&apos;S NEXT?
        </span>
        <span className="text-cream/70 text-base leading-snug">
          More features and integrations are coming soon! Tag @MonkeDAO.
        </span>
      </div>

      {/* Pick a monke — by number anywhere; the owned grid is below in the app. */}
      <>
          <div className="flex flex-col items-center gap-4 md:gap-6">
            <CollectionToggle value={collection} onChange={setCollection} />

            {/* Desktop: text input */}
            <div className="hidden md:block w-full max-w-sm">
              <SearchBar
                value={query}
                onChange={setQuery}
                onSubmit={runSearch}
                maxDigits={MAX_DIGITS}
              />
            </div>

            {/* Mobile: big display + numpad */}
            <div className="md:hidden w-full flex flex-col items-center gap-4">
              <div className="pixel-border bg-screen w-full max-w-xs text-center py-2">
                <span className="font-[family-name:var(--font-body)] text-5xl text-cream">
                  {query || <span className="text-cream/30">0000</span>}
                </span>
              </div>
              <NumberPad
                onDigit={(d) =>
                  setQuery((q) =>
                    (q + d).replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS)
                  )
                }
                onBackspace={() => setQuery((q) => q.slice(0, -1))}
                onClear={() => setQuery("")}
              />
            </div>

            {/* Explicit search — one query per number, not one per digit typed. */}
            <button
              type="button"
              onClick={runSearch}
              disabled={!query}
              className="
                w-full max-w-xs md:max-w-sm pixel-border bg-banana text-screen
                font-[family-name:var(--font-display)] text-sm py-3
                disabled:opacity-40 disabled:pointer-events-none
                active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                transition-transform duration-75
              "
            >
              SEARCH
            </button>
          </div>

          {/* Result */}
          <div className="min-h-[2rem] flex items-center justify-center">
            {status === "loading" && <BlinkingCursor label="SEARCHING" />}
            {status === "notfound" && (
              <p className="font-[family-name:var(--font-display)] text-pixelred text-xs text-center">
                [ NO MONKE #{query} IN {collection.toUpperCase()} ]
              </p>
            )}
            {status === "found" && result && (
              <NFTPreviewCard nft={result} onUse={() => handleUse(result)} />
            )}
          </div>
        </>

      {/* Gallery — owned monkeys in shell mode, otherwise "recently worn".
          Hidden entirely until there's something to show, so the finder is one
          screen on first visit (no "featured" fallback). */}
      {(shellMode || gallery.length > 0) && (
        <NFTGrid
          title={galleryTitle}
          nfts={gallery}
          loading={galleryLoading}
          onSelect={handleUse}
        />
      )}
    </div>
  );
}
