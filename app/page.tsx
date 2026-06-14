"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Collection, NFT } from "@/lib/types";
import { getNFT, getNFTs, preloadCollection } from "@/lib/nftData";
import { addRecent, getRecent } from "@/lib/recentlyViewed";
import { FEATURED } from "@/lib/featured";
import { useAppStore } from "@/store/useAppStore";
import { CollectionToggle } from "@/components/common/CollectionToggle";
import { SearchBar } from "@/components/search/SearchBar";
import { NumberPad } from "@/components/search/NumberPad";
import { NFTPreviewCard } from "@/components/search/NFTPreviewCard";
import { NFTGrid } from "@/components/gallery/NFTGrid";
import { BlinkingCursor } from "@/components/ui/BlinkingCursor";

type Status = "idle" | "loading" | "found" | "notfound";

export default function Home() {
  const router = useRouter();
  const setSelectedNFT = useAppStore((s) => s.setSelectedNFT);

  const [collection, setCollection] = useState<Collection>("gen2");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<NFT | null>(null);

  const [gallery, setGallery] = useState<NFT[]>([]);
  const [galleryTitle, setGalleryTitle] = useState("FEATURED MONKES");
  const [galleryLoading, setGalleryLoading] = useState(true);

  // Gen2 and Gen3 number differently (Gen3 ids run into 5 digits), so we
  // don't hard-cap by a fixed supply — validity is decided by whether the id
  // exists in the loaded data. MAX_DIGITS just bounds the input length.
  const MAX_DIGITS = 6;

  // Warm the data cache as soon as a collection is in focus.
  useEffect(() => {
    preloadCollection(collection);
  }, [collection]);

  // Load the gallery once (recently viewed, or featured seed as fallback).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const recent = getRecent();
      const refs = recent.length > 0 ? recent : FEATURED;
      setGalleryTitle(recent.length > 0 ? "RECENTLY WORN" : "FEATURED MONKES");
      const nfts = await getNFTs(refs);
      if (!cancelled) {
        setGallery(nfts);
        setGalleryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced lookup whenever the number or collection changes.
  const lookupRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (lookupRef.current) clearTimeout(lookupRef.current);

    const num = Number(query);
    if (!query || Number.isNaN(num) || num < 1) {
      setStatus("idle");
      setResult(null);
      return;
    }

    setStatus("loading");
    lookupRef.current = setTimeout(async () => {
      const nft = await getNFT(collection, num);
      if (nft) {
        setResult(nft);
        setStatus("found");
      } else {
        setResult(null);
        setStatus("notfound");
      }
    }, 200);

    return () => {
      if (lookupRef.current) clearTimeout(lookupRef.current);
    };
  }, [query, collection]);

  const handleUse = useCallback(
    (nft: NFT) => {
      addRecent({ collection: nft.collection, id: nft.id });
      setSelectedNFT(nft);
      router.push("/record");
    },
    [router, setSelectedNFT]
  );

  const handleGallerySelect = useCallback((nft: NFT) => {
    setCollection(nft.collection);
    setQuery(String(nft.id));
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const submit = useCallback(() => {
    if (status === "found" && result) handleUse(result);
  }, [status, result, handleUse]);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col gap-10">
      {/* Hero */}
      <header className="text-center md:text-left">
        <h1 className="font-[family-name:var(--font-display)] text-banana text-2xl md:text-4xl leading-tight">
          FIND YOUR MONKE
        </h1>
        <p className="text-cream/60 text-xl mt-2">
          Type your number. Wear it. Record it.
        </p>
      </header>

      {/* Search controls */}
      <div className="flex flex-col items-center gap-6">
        <CollectionToggle value={collection} onChange={setCollection} />

        {/* Desktop: text input */}
        <div className="hidden md:block w-full max-w-sm">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSubmit={submit}
            maxDigits={MAX_DIGITS}
          />
        </div>

        {/* Mobile: big display + numpad */}
        <div className="md:hidden w-full flex flex-col items-center gap-5">
          <div className="pixel-border bg-screen w-full max-w-xs text-center py-4">
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

      {/* Gallery */}
      <NFTGrid
        title={galleryTitle}
        nfts={gallery}
        loading={galleryLoading}
        onSelect={handleGallerySelect}
      />
    </div>
  );
}
