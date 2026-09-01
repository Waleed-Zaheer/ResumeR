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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // Next's inline hydration/GA snippets and Google's gtag.js loader.
              // 'unsafe-eval' is dev-only — Turbopack/React dev tooling use eval()
              // for HMR and stack traces; production React never calls it.
              `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${
                process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""
              }`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
