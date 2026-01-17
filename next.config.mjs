/** @type {import('next').NextConfig} */
const nextConfig = {
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
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Headers for performance, security, and mobile TLS support
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
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
            // CRITICAL: Allow unsafe-eval ONLY for Next.js runtime (required for code splitting)
            // Without this, iOS Safari blocks Next.js's internal eval() and crashes
            // This is the minimal CSP needed - unsafe-eval is only for Next.js chunks
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:;",
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



