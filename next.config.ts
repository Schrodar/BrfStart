import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fristående server för Docker-imagen (se Dockerfile): bygget lägger en
  // server.js med bara de beroenden som faktiskt används i .next/standalone.
  // Imagen blir en bråkdel så stor som med hela node_modules.
  output: "standalone",
  env: {
    // Stämpel per bygge. Trapphustavlan jämför sin egen med serverns och
    // laddar om sig efter en ny deploy (src/lib/board.ts).
    NEXT_PUBLIC_BUILD_STAMP: String(Date.now()),
  },
  // Dev-servern svarar bara localhost. En testskärm i en virtuell maskin eller
  // på en annan dator når den via datorns IP – lägg till den här, t.ex.
  // DEV_ALLOWED_ORIGINS=192.168.1.10 i .env.local. Påverkar inte produktion.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  experimental: {
    serverActions: {
      // Uppladdningar (foton, planritningar, dokument, nyhetsbilder) går via
      // server actions, som annars stoppar allt över 1 MB. Filerna begränsas
      // till 5 MB (MAX_FILE_BYTES i src/lib/storage.ts) och gränsen här ligger
      // strax över för att lämna plats åt formulärdatan. Hela filen hålls i
      // minnet under uppladdningen, så höj inte gränsen utan att tänka på
      // serverns RAM. Höjs den: ändra båda värdena tillsammans.
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
