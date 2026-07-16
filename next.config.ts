import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  experimental: {
    // Turbopack's persistent disk cache for dev (.next/dev/cache) keeps
    // corrupting on this machine — "Unable to write SST file", "Another
    // write batch or compaction is already active" — most likely something
    // on Windows (Defender real-time scanning, a sync client) locking files
    // mid-write. Disabling it trades slightly slower cold rebuilds for a
    // dev server that doesn't crash every couple of minutes.
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
