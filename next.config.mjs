/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable React 19 features
    reactCompiler: false,
  },
  // Improved performance settings for Next.js 15
  poweredByHeader: false,
  compress: true,
  // Enhanced image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
