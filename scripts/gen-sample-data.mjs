/**
 * gen-sample-data.mjs — generates PLACEHOLDER data so the app is fully
 * testable before the real collection is fetched.
 *
 * Produces public/data/gen2.json and gen3.json with all 5000 tokens each,
 * pointing at deterministic, CORS-friendly placeholder images (so canvas
 * compositing + recording work end to end).
 *
 * Replace these files by running scripts/fetch-metadata.ts with real data.
 *
 *   node scripts/gen-sample-data.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "public", "data");
const SUPPLY = 5000;

function build(collection, label) {
  const out = {};
  for (let id = 1; id <= SUPPLY; id++) {
    out[String(id)] = {
      // picsum serves square images with Access-Control-Allow-Origin: *,
      // so <img crossOrigin="anonymous"> + canvas drawImage works.
      image: `https://picsum.photos/seed/monkegram-${collection}-${id}/512`,
      name: `${label} #${id}`,
    };
  }
  return out;
}

await mkdir(OUT_DIR, { recursive: true });

await writeFile(
  join(OUT_DIR, "gen2.json"),
  JSON.stringify(build("gen2", "SMB"))
);
await writeFile(
  join(OUT_DIR, "gen3.json"),
  JSON.stringify(build("gen3", "SMB Gen3"))
);

console.log("Wrote placeholder public/data/gen2.json and gen3.json (5000 each).");
