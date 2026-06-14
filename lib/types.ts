export type Collection = "gen2" | "gen3";

export const COLLECTIONS: { id: Collection; label: string }[] = [
  { id: "gen2", label: "GEN2" },
  { id: "gen3", label: "GEN3" },
];

/** One token's renderable data, as stored in public/data/{collection}.json */
export interface NFTRecord {
  image: string;
  name: string;
}

/** Full lookup table for a collection: tokenId (string) -> record */
export type CollectionData = Record<string, NFTRecord>;

/** Resolved NFT used throughout the UI */
export interface NFT extends NFTRecord {
  id: number;
  collection: Collection;
}
