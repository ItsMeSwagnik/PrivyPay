/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  outputFileTracingRoot: new URL("..", import.meta.url).pathname,
  transpilePackages: ["@ctd/sdk", "@ctd/disclosure"],
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
}

export default nextConfig
