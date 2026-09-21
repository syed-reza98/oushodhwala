import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "oushodhwala.lovable.app" },
    ],
  },
  // Interim during migration: legacy components still being ported off TanStack/Supabase.
  // Remove once Wave E completes and `rg '@tanstack|@supabase' src` is clean.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
