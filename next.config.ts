import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Uppladdningar (foton, planritningar, dokument, nyhetsbilder) går via
      // server actions, som annars stoppar allt över 1 MB. Netlify tar emot
      // högst ca 6 MB per förfrågan, så filerna begränsas till 5 MB
      // (MAX_FILE_BYTES i src/lib/storage.ts) för att lämna plats åt
      // formulärdatan.
      bodySizeLimit: "6mb",
    },
  },
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
