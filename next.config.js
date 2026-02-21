const fs = require('fs');
const path = require('path');

// Generate a unique build ID (timestamp) at build time.
// This gets baked into the JS bundle via NEXT_PUBLIC_BUILD_ID and also
// written to public/version.json. The app periodically fetches version.json
// and reloads if the build ID has changed (i.e. a new deployment happened).
const BUILD_ID = Date.now().toString();

// Write version.json so the running app can check for new deployments
fs.writeFileSync(
  path.join(__dirname, 'public', 'version.json'),
  JSON.stringify({ buildId: BUILD_ID, builtAt: new Date().toISOString() })
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  // Prevent browsers/WKWebView from caching stale HTML pages.
  // Static assets (/_next/static/*) use content hashes, so they're
  // safe to cache forever — only HTML responses need no-cache.
  async headers() {
    return [
      {
        // Apply to all page routes (HTML responses)
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
