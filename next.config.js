const { withSentryConfig } = require("@sentry/nextjs");

// Mock-mode safety: a production build with NEXT_PUBLIC_MOCK_MODE=true would
// ship the mock state in place of real indexer/REST data. Fail fast so a
// stray env var can never hit prod. Use NEXT_PHASE so the guard only fires
// for `next build`, not `next lint` / `next dev`.
if (
  process.env.NEXT_PHASE === "phase-production-build" &&
  process.env.NEXT_PUBLIC_MOCK_MODE === "true"
) {
  throw new Error(
    "NEXT_PUBLIC_MOCK_MODE=true is forbidden in production builds"
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  async redirects() {
    return [
      {
        source: "/design/components",
        destination: "/design",
        permanent: true,
      },
      {
        source: "/design/core",
        destination: "/design",
        permanent: true,
      },
      {
        source: "/btc-deposit-flow",
        destination: "/guides/btc-deposit-flow.html",
        permanent: false,
      },
      {
        source: "/dex-operations",
        destination: "/guides/dex-operations.html",
        permanent: false,
      },
      {
        source: "/lend-to-twilight-pool",
        destination: "/guides/lend-to-twilight-pool.html",
        permanent: false,
      },
    ];
  },
  transpilePackages: ["klinecharts"],
  webpack: (config) => {
    config.externals.push(
      // nextjs bundler cant correctly resolve deeply nested client and server dependencies, temporary fix
      "pino-pretty",
      "lokijs",
      "bufferutil",
      "utf-8-validate"
    );
    config.experiments = { asyncWebAssembly: true, layers: true };
    // Suppress warnings from third-party packages
    config.ignoreWarnings = [
      { module: /node_modules\/@selfxyz\/anon-aadhaar-core/ },
      { module: /node_modules\/web-worker/ },
      { module: /node_modules\/node-fetch/ },
    ];
    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: true,
  },
});
