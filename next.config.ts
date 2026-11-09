import type { NextConfig } from "next";

// This Next.js layer only hosts the static Vite build of `Front-End/app`.
// All SPA routes are rewritten to /app/index.html so react-router works.
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/app/index.html" },
      ],
      afterFiles: [],
      fallback: [
        { source: "/:path((?!api|app|_next).*)", destination: "/app/index.html" },
      ],
    };
  },
};

export default nextConfig;
