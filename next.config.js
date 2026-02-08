/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent "Cannot find module './vendor-chunks/@clerk.js'" - load Clerk from node_modules on server
  serverExternalPackages: ["@clerk/nextjs"],
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
