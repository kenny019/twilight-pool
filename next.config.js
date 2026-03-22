const { withSentryConfig } = require("@sentry/nextjs");

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
