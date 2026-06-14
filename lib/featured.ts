import type { NFTRef } from "./recentlyViewed";

/**
 * Hand-picked seed tokens shown in the gallery before a user has any
 * history. Mix of Gen2 and Gen3 so both collections are represented.
 */
export const FEATURED: NFTRef[] = [
  { collection: "gen2", id: 1 },
  { collection: "gen2", id: 42 },
  { collection: "gen2", id: 100 },
  { collection: "gen2", id: 777 },
  { collection: "gen2", id: 1234 },
  { collection: "gen2", id: 2500 },
  // Gen3 ids are sparse and run to 5 digits — these all exist in the data.
  { collection: "gen3", id: 2 },
  { collection: "gen3", id: 2738 },
  { collection: "gen3", id: 5447 },
  { collection: "gen3", id: 8202 },
  { collection: "gen3", id: 10804 },
  { collection: "gen3", id: 14223 },
];
