import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!backendUrl) {
      throw new Error("BACKEND_URL must be set to the backend origin");
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
