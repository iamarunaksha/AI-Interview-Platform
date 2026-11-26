import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker production deployments
  // Produces a self-contained server.js with minimal node_modules
  output: "standalone",

  // Performance optimizations
  cacheComponents: true,
  partialPrefetching: true,

  // Turbopack CSS rules (dev mode)
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // Production security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
