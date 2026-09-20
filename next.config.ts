import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Annonsfoton hämtas från Supabase Storage.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
