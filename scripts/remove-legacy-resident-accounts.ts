// Tar bort boendekonton från tiden med registrering i EN förening: personliga
// konton (med riktig e-post) och rollen boende. Lägenheternas konton
// (@konto.invalid) och styrelsens konton rörs inte.
//
//   npm run members:legacy -- <förening-slug>             visar bara vilka konton det gäller
//   npm run members:legacy -- <förening-slug> --bekrafta  tar bort dem
//
// Kör det när breven med koder har delats ut. Ett gammalt konto försvinner
// annars av sig självt när lägenhetens kod används första gången.
//
// Felanmälningarna finns kvar för styrelsen men kopplas bort från kontot, och
// en lägenhet som kontot ägde släpps – annonsen och uppgifterna ligger kvar.
// Inloggningarna kan höra till fler föreningar och tas inte bort här: kör
// `npm run users:prune` efteråt. Med --bekrafta sparas först en lista över
// kontona i ../backup/.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env";

loadEnv();

/** Samma domän som APARTMENT_ACCOUNT_DOMAIN i src/lib/data/access-codes.ts. */
const APARTMENT_ACCOUNT_SUFFIX = "@konto.invalid";

const confirm = process.argv.includes("--bekrafta");
const slug = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

if (!slug) {
  console.error("Kör: npm run members:legacy -- <förening-slug> [--bekrafta]");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const association = await prisma.association.findUnique({ where: { slug: slug! } });
  if (!association) {
    console.error(`Ingen förening med slug "${slug}".`);
    process.exit(1);
  }

  const residents = await prisma.member.findMany({
    where: { associationId: association.id, role: "member" },
    select: {
      id: true,
      email: true,
      fullName: true,
      apartment: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const legacy = residents.filter(
    (m) => !m.email.toLowerCase().endsWith(APARTMENT_ACCOUNT_SUFFIX),
  );

  console.info(
    `${residents.length} boendekonton i "${slug}", varav ${legacy.length} personliga från tiden med registrering:`,
  );
  for (const m of legacy) {
    console.info(`  ${m.email} – ${m.fullName}, lgh ${m.apartment || "–"} (${m.status})`);
  }

  if (!confirm || legacy.length === 0) {
    if (!confirm) {
      console.info("\nTorrkörning – inget är borttaget. Lägg till --bekrafta för att ta bort.");
    }
    return;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const dir = path.resolve(process.cwd(), "..", "backup");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `gamla-boendekonton-${slug}-${stamp}.json`);
  writeFileSync(file, JSON.stringify(legacy, null, 2));
  console.info(`\n✔ Lista sparad: ${file}`);

  const result = await prisma.member.deleteMany({
    where: {
      associationId: association.id,
      id: { in: legacy.map((m) => m.id) },
    },
  });
  console.info(`✔ ${result.count} konton borttagna. Kör nu: npm run users:prune`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
