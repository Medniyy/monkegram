import { create } from "zustand";
import type { NFT } from "@/lib/types";

export type BlendMode = "source-over" | "multiply" | "screen";

export interface MaskSettings {
  opacity: number; // 0..1
  sizeOffset: number; // -0.2 .. 0.3 (fraction of auto-fit)
  flip: boolean; // mirror horizontally
  blend: BlendMode;
}

interface AppState {
  selectedNFT: NFT | null;
  mask: MaskSettings;
  audioEnabled: boolean;
  setSelectedNFT: (nft: NFT | null) => void;
  setMask: (patch: Partial<MaskSettings>) => void;
  resetMask: () => void;
  setAudioEnabled: (on: boolean) => void;
}

const DEFAULT_MASK: MaskSettings = {
  opacity: 0.9,
  sizeOffset: 0,
  flip: false,
  blend: "source-over",
};

export const useAppStore = create<AppState>((set) => ({
  selectedNFT: null,
  mask: DEFAULT_MASK,
  audioEnabled: true,
  setSelectedNFT: (nft) => set({ selectedNFT: nft }),
  setMask: (patch) => set((s) => ({ mask: { ...s.mask, ...patch } })),
  resetMask: () => set({ mask: DEFAULT_MASK }),
  setAudioEnabled: (on) => set({ audioEnabled: on }),
}));
