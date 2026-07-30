/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Team handoff creatives can be large; no intentional app cap (platform still may limit).
    middlewareClientMaxBodySize: "512mb",
  },
  async redirects() {
    return [
      {
        source: "/kick69/accounts",
        destination: "/kiik69accounts",
        permanent: true,
      },
      {
        source: "/kick69/accounts/:path*",
        destination: "/kiik69accounts",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    unoptimized: false,
  },
};

module.exports = nextConfig;
