/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  outputFileTracingRoot: "D:/Swagnik/Codes/PrivyPay/privypay/frontend",
  transpilePackages: ["@ctd/sdk", "@ctd/disclosure"],
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
}

export default nextConfig
