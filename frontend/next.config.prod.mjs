/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' http://localhost:8080 https://api.openai.com",
              "media-src 'self'",
              "object-src 'none'",
              "child-src 'none'",
              "worker-src 'none'",
              "frame-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ]
      }
    ];
  },

  // Redirect HTTP to HTTPS in production
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/(.*)',
          has: [
            {
              type: 'header',
              key: 'x-forwarded-proto',
              value: 'http'
            }
          ],
          destination: 'https://yourdomain.com/:path*',
          permanent: true
        }
      ];
    }
    return [];
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0'
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['localhost'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },

  // Security-focused webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Remove source maps in production for security
    if (!dev && !isServer) {
      config.devtool = false;
    }

    // Add security-focused optimizations
    config.optimization = {
      ...config.optimization,
      sideEffects: false,
      usedExports: true
    };

    return config;
  },

  // Experimental features for security
  experimental: {
    serverComponentsExternalPackages: [],
    strictNextHead: true
  },

  // Output configuration for production
  output: 'standalone',

  // HTTP headers for security
  httpAgentOptions: {
    keepAlive: true
  }
};

export default nextConfig;
