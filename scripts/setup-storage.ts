// Skapar Storage-bucketsen (idempotent). Kör: npx tsx scripts/setup-storage.ts
//
// tsx läser inte .env.local automatiskt, så vi laddar den (och .env) manuellt.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    // filen finns inte – strunta i det
  }
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Saknar NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY i .env.local",
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function ensureBucket(name: string, isPublic: boolean) {
  const { data: existing } = await supabase.storage.getBucket(name);
  if (existing) {
    console.info(`• ${name} finns redan`);
    return;
  }
  const { error } = await supabase.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: "10MB",
    allowedMimeTypes: isPublic
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  });
  if (error) {
    console.error(`✗ ${name}: ${error.message}`);
    process.exit(1);
  }
  console.info(`✔ skapade ${name} (${isPublic ? "publik" : "privat"})`);
}

async function main() {
  await ensureBucket("apartment-photos", true);
  await ensureBucket("floor-plans", false);
  await ensureBucket("documents", false);
  await ensureBucket("news-images", true);
  console.info("Klar.");
}

main();
