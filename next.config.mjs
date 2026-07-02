const BASE_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:;";

function chatEmbedFrameAncestorsDirective() {
  const fromEnv = (process.env.CHAT_EMBED_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv.length) return `'self' ${fromEnv.join(" ")}`;
  if (process.env.NODE_ENV !== "production") {
    return "'self' http://localhost:3000 http://localhost:3001 http://127.0.0.1:3000";
  }
  return "'self'";
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Let Next load @clerk/nextjs from node_modules on the server instead of bundling (fixes vendor-chunks/@clerk.js resolution)
  serverExternalPackages: ["@clerk/nextjs", "@prisma/client", "pdf-parse", "pdfjs-dist"],
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // CRITICAL: Disable eval-source-map in production to prevent iOS Safari crashes
  // Next.js uses eval-source-map by default which triggers CSP violations on iOS
  productionBrowserSourceMaps: false,
  
  // Webpack config to completely disable eval() usage in production
  webpack: (config, { dev, isServer }) => {
    // Completely disable source maps in production to prevent eval() usage
    if (!dev && !isServer) {
      // Disable devtool completely - no source maps = no eval()
      config.devtool = false;
      
      // Ensure optimization doesn't use eval
      if (config.optimization) {
        config.optimization.minimize = true;
        // Disable source maps in minimizers
        if (Array.isArray(config.optimization.minimizer)) {
          config.optimization.minimizer.forEach((minimizer) => {
            if (minimizer && minimizer.options) {
              minimizer.options.sourceMap = false;
            }
          });
        }
      }
    }
    return config;
  },
  
  // Image optimization
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
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [50, 60, 70, 75, 80, 85, 90, 95],
    minimumCacheTTL: 60,
  },

  // Headers for performance, security, and mobile TLS support
  async headers() {
    const embedFrameAncestors = chatEmbedFrameAncestorsDirective();
    return [
      {
        source: "/:outlet/chat/embed",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: `${BASE_CSP} frame-ancestors ${embedFrameAncestors};`,
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: `${BASE_CSP} frame-ancestors 'self';`,
          },
        ],
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;



