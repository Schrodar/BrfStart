// Tar bort Auth-konton som inte hör till någon förening och inte är
// plattformsadmin – till exempel demokonton efter att föreningarna tagits bort.
//
//   npm run users:prune               visar bara vilka konton det gäller
//   npm run users:prune -- --bekrafta tar bort dem
//
// Ett konto hör till en förening om dess e-post har en medlemsrad där
// (kopplingen är på e-post, se Member). Med --bekrafta sparas först en lista
// över kontona (id, e-post, datum) i ../backup/ – lösenorden går inte att spara.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env";

loadEnv();

const confirm = process.argv.includes("--bekrafta");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const memberEmails = new Set(
    (await prisma.member.findMany({ select: { email: true } })).map((m) =>
      m.email.toLowerCase(),
    ),
  );
  const adminIds = new Set(
    (await prisma.platformAdmin.findMany({ select: { userId: true } })).map(
      (a) => a.userId,
    ),
  );

  const orphans = users.filter(
    (u) => !adminIds.has(u.id) && !memberEmails.has((u.email ?? "").toLowerCase()),
  );

  console.info(`${users.length} konton, varav ${orphans.length} utan förening och utan plattformsroll:`);
  for (const u of orphans) console.info(`  ${u.email}`);
  const kept = users.filter((u) => !orphans.includes(u)).map((u) => u.email);
  console.info(`Behålls: ${kept.join(", ") || "–"}`);

  if (!confirm || orphans.length === 0) {
    if (!confirm) console.info("\nTorrkörning – inget är borttaget. Lägg till --bekrafta för att ta bort.");
    return;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.resolve(process.cwd(), "..", "backup");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `auth-konton-${stamp}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      orphans.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })),
      null,
      2,
    ),
  );
  console.info(`\n✔ Lista sparad: ${file}`);

  for (const u of orphans) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) throw new Error(`Kunde inte ta bort ${u.email}: ${error.message}`);
    console.info(`✔ ${u.email} borttaget`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
