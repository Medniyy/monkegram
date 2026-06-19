import type { NextConfig } from "next";

// Served from the Medniyy/monkegram GitHub Pages project site. Override with
// NEXT_PUBLIC_BASE_PATH="" to
// serve from a domain root instead.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/monkegram";

const nextConfig: NextConfig = {
  // Pure static export — no server, no API routes. Deploys to Cloudflare Pages for free.
  output: "export",
  // Serve the whole app under a subpath.
  basePath,
  // Expose the basePath to client code for raw fetch()/asset string paths.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // The static export has no Image Optimization server; NFT images load directly
  // from Arweave / Irys via plain <img>. Disable the optimizer.
  images: {
    unoptimized: true,
  },
  // Trailing slashes make static hosting routing predictable.
  trailingSlash: true,
};

export default nextConfig;
