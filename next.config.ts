import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // a small self-contained server for the Docker image
  // Every page here is per-signed-in-user (a session cookie decides what it shows), so there is nothing to prerender or cache:
  // the scaffold's cacheComponents / partialPrefetching are off.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
