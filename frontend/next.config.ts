import type { NextConfig } from "next";

/**
 * Same-origin API proxy (Docker Compose topology). Local development can point
 * this at the API service with `API_PROXY_TARGET=http://localhost:8000` so the
 * auth cookie stays same-origin and middleware protection works identically.
 */
const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://api:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
      // Infra probes live outside the versioned API prefix (backend infra.py);
      // expose them through the same-origin proxy for the Deployment Center.
      {
        source: "/healthz",
        destination: `${apiProxyTarget}/healthz`,
      },
      {
        source: "/readyz",
        destination: `${apiProxyTarget}/readyz`,
      },
    ];
  },
};

export default nextConfig;
