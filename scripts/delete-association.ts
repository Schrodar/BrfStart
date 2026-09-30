// Tar bort en förening med allt innehåll: raderna i databasen och filerna i
// Storage.
//
//   npm run association:delete -- <slug>              visar bara vad som finns
//   npm run association:delete -- <slug> --bekrafta   tar bort på riktigt
//
// Med --bekrafta sparas först en säkerhetskopia – alla rader som JSON och alla
// filer – i ../backup/<slug>-<datum>/ bredvid repot.
//
// Loggboken (AuditEvent) rörs inte: den ska överleva att en förening tas bort.
// Auth-kontona rörs inte heller, eftersom samma konto kan vara medlem i flera
// föreningar. Kör users:prune efteråt för konton som inte hör till någon.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env";

loadEnv();

const slug = process.argv[2]?.trim();
const confirm = process.argv.includes("--bekrafta");
if (!slug || slug.startsWith("--")) {
  console.error("Kör: npm run association:delete -- <slug> [--bekrafta]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const association = await prisma.association.findUnique({
    where: { slug: slug! },
  });
  if (!association) {
    console.error(`Ingen förening med slug "${slug}".`);
    process.exit(1);
  }
  const where = { associationId: association.id };

  // Allt som hör till föreningen, i en form som går att spara och läsa tillbaka.
  const rows = {
    association,
    platformAccount: await prisma.platformAccount.findMany({ where }),
    supportSessions: await prisma.supportSession.findMany({ where }),
    members: await prisma.member.findMany({ where }),
    news: await prisma.newsPost.findMany({ where }),
    boardGroups: await prisma.boardGroup.findMany({ where }),
    boardMembers: await prisma.boardMember.findMany({ where }),
    documents: await prisma.document.findMany({ where }),
    maintenanceCategories: await prisma.maintenanceCategory.findMany({ where }),
    maintenanceSettings: await prisma.maintenanceSettings.findMany({ where }),
    maintenanceRequests: await prisma.maintenanceRequest.findMany({ where }),
    maintenanceEvents: await prisma.maintenanceEvent.findMany({ where }),
    siteContent: await prisma.siteContent.findMany({ where }),
    associationInfo: await prisma.associationInfo.findMany({ where }),
    economyFigures: await prisma.economyFigures.findMany({ where }),
    buildings: await prisma.building.findMany({ where }),
    apartments: await prisma.apartment.findMany({ where }),
    apartmentPhotos: await prisma.apartmentPhoto.findMany({ where }),
  };

  // Filerna ligger under <associationId>/ i de delade bucketarna. Listan tas
  // ur storage.objects, men borttagningen går via API:t så att även själva
  // filerna försvinner.
  const files = await prisma.$queryRaw<{ bucket_id: string; name: string }[]>`
    select bucket_id, name from storage.objects
    where name like ${`${association.id}/%`}
    order by bucket_id, name`;

  console.info(`${association.name} (${association.slug})`);
  for (const [table, value] of Object.entries(rows)) {
    if (Array.isArray(value) && value.length) {
      console.info(`  ${table}: ${value.length}`);
    }
  }
  console.info(`  filer i Storage: ${files.length}`);

  if (!confirm) {
    console.info("\nTorrkörning – inget är borttaget. Lägg till --bekrafta för att ta bort.");
    return;
  }

  // 1. Säkerhetskopia: raderna som JSON och filerna som de ligger i bucketarna.
  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.resolve(process.cwd(), "..", "backup", `${slug}-${stamp}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "data.json"), JSON.stringify(rows, null, 2));
  for (const file of files) {
    const { data, error } = await supabase.storage
      .from(file.bucket_id)
      .download(file.name);
    if (error || !data) throw new Error(`Kunde inte kopiera ${file.bucket_id}/${file.name}: ${error?.message}`);
    const target = path.join(dir, "files", file.bucket_id, file.name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await data.arrayBuffer()));
  }
  console.info(`\n✔ Säkerhetskopia: ${dir}`);

  // 2. Filerna, per bucket.
  const byBucket = new Map<string, string[]>();
  for (const file of files) {
    byBucket.set(file.bucket_id, [...(byBucket.get(file.bucket_id) ?? []), file.name]);
  }
  for (const [bucket, names] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(names);
    if (error) throw new Error(`Kunde inte ta bort filer i ${bucket}: ${error.message}`);
  }
  console.info(`✔ ${files.length} filer borttagna`);

  // 3. Raderna. Två relationer är Restrict (felanmälan → kategori, ledamot →
  // grupp), så de tas i den ordningen först. Resten följer med föreningen via
  // kaskad.
  await prisma.$transaction([
    prisma.maintenanceRequest.deleteMany({ where }),
    prisma.maintenanceCategory.deleteMany({ where }),
    prisma.boardMember.deleteMany({ where }),
    prisma.boardGroup.deleteMany({ where }),
    prisma.association.delete({ where: { id: association.id } }),
  ]);
  console.info(`✔ Föreningen "${slug}" är borttagen`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
