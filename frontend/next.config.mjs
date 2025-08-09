/** @type {import('next').NextConfig} */
const nextConfig = {
  // Simplified development configuration
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:8080/api/v1',
    NEXT_PUBLIC_APP_VERSION: '1.0.0'
  },
  
  // Basic settings
  poweredByHeader: false,
  compress: true,
  
  // Images
  images: {
    domains: ['localhost', '127.0.0.1']
  },
  
  // Allow cross-origin requests in development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          }
        ]
      }
    ];
  }
};

export default nextConfig;