// Skapar (eller uppdaterar) en förening. Idempotent.
// Kör: npx tsx scripts/create-association.ts <slug> <namn>
//
// slug matchar ASSOCIATION_SLUG i deployens env. Körs en gång per ny förening.
//
// Utöver Association-raden skapas de singelrader och kategorier som appen
// behöver för att fungera. Utan dem faller sidorna tillbaka på kod-defaults,
// och utan felkategorier går det inte att skicka en felanmälan alls.
//
// Innehållet är TOMT med flit – styrelsen fyller i sina egna uppgifter via
// adminpanelen, och sidorna hoppar över det som inte är ifyllt. Demodata för
// utveckling skapas i stället av prisma/seed.ts.

import { PrismaClient } from "@prisma/client";
import {
  EMPTY_ASSOCIATION_INFO,
  emptySiteContent,
} from "../src/lib/data/defaults";
import {
  DEFAULT_MAINTENANCE_CATEGORIES,
  DEFAULT_MAINTENANCE_SETTINGS,
} from "../src/lib/data/maintenance";

const prisma = new PrismaClient();
const slug = process.argv[2]?.trim();
const name = process.argv.slice(3).join(" ").trim();

if (!slug || !name) {
  console.error('Kör: npx tsx scripts/create-association.ts <slug> "<namn>"');
  process.exit(1);
}

async function main() {
  const association = await prisma.association.upsert({
    where: { slug: slug! },
    update: { name },
    create: { slug: slug!, name },
  });
  const associationId = association.id;
  const skapat: string[] = [];

  if (!(await prisma.siteContent.findFirst({ where: { associationId } }))) {
    await prisma.siteContent.create({
      data: { associationId, ...emptySiteContent(association.name) },
    });
    skapat.push("sidinnehåll");
  }

  if (!(await prisma.associationInfo.findFirst({ where: { associationId } }))) {
    await prisma.associationInfo.create({
      data: { associationId, ...EMPTY_ASSOCIATION_INFO },
    });
    skapat.push("föreningsfakta");
  }

  if (
    !(await prisma.maintenanceSettings.findFirst({ where: { associationId } }))
  ) {
    await prisma.maintenanceSettings.create({
      data: { associationId, ...DEFAULT_MAINTENANCE_SETTINGS },
    });
    skapat.push("felanmälningsinställningar");
  }

  const kategorier = await prisma.maintenanceCategory.count({
    where: { associationId },
  });
  if (kategorier === 0) {
    for (const [i, name] of DEFAULT_MAINTENANCE_CATEGORIES.entries()) {
      await prisma.maintenanceCategory.create({
        data: { associationId, name, sortOrder: i + 1 },
      });
    }
    skapat.push(`${DEFAULT_MAINTENANCE_CATEGORIES.length} felkategorier`);
  }

  console.info(`✔ Förening "${association.slug}" (${association.name}) klar.`);
  console.info(
    skapat.length > 0
      ? `  Skapade: ${skapat.join(", ")}.`
      : "  Allt fanns redan – inget ändrat.",
  );
  console.info(
    "  Föreningsuppgifter och texter är tomma. Fyll i dem under Föreningsinfo och Innehåll i adminpanelen.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
