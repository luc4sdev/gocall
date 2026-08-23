import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const allowedOrigins = ['http://127.0.0.1:53127', 'http://localhost:3000'];
    return allowedOrigins.map((origin) => ({
      source: '/api/:path*',
      has: [{ type: 'header' as const, key: 'origin', value: origin }],
      headers: [
        { key: 'Access-Control-Allow-Origin', value: origin },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
      ],
    }));
  }
};

export default nextConfig;
