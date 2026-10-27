/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  devIndicators: false,
  async rewrites() {
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "http://localhost:3211";
    return [
      {
        source: "/api/auth/:path*",
        destination: `${convexSiteUrl}/api/auth/:path*`,
      },
    ];
  },
}

export default nextConfig;
