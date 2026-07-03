import type { NextConfig } from "next";

// Security headers live in src/middleware.ts (single source of truth):
// X-Frame-Options DENY, CSP, HSTS, Referrer-Policy, Permissions-Policy.
// Only headers the middleware does not set belong here.
const nextConfig: NextConfig = {
  // pdf-parse (and its pdfjs-dist dependency) must be loaded from node_modules
  // at runtime rather than bundled: the bundler cannot resolve pdfjs's dynamic
  // worker import, which otherwise fails with "Setting up fake worker failed".
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-DNS-Prefetch-Control", value: "on" }],
      },
    ];
  },
};

export default nextConfig;
