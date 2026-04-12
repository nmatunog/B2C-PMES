/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Same URL path as Nest (`POST /auth/sync-member`) so the Vite client does not need changes. */
  async rewrites() {
    return [{ source: "/auth/sync-member", destination: "/api/auth/sync-member" }];
  },
};

export default nextConfig;
