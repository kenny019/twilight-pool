/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
  transpilePackages: ["lightweight-charts"],
  webpack: (config) => {
    config.externals.push(
      // nextjs bundler cant correctly resolve deeply nested client and server dependencies, temporary fix
      "pino-pretty",
      "lokijs",
      "bufferutil",
      "utf-8-validate"
    );
    config.experiments = { asyncWebAssembly: true, layers: true };
    return config;
  },
};

module.exports = nextConfig;
