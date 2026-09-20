// Seedar databasen med demoinnehåll för EN förening (multi-tenant).
// Kör: npm run db:seed
// Relativa importer med flit så att tsx kör utan tsconfig-path-alias.

import { PrismaClient } from "@prisma/client";
import {
  DEMO_ASSOCIATION_INFO,
  DEMO_ASSOCIATION_PROFILE,
  demoSiteContent,
} from "../src/lib/data/defaults";
import {
  DEFAULT_MAINTENANCE_CATEGORIES,
  DEFAULT_MAINTENANCE_SETTINGS,
} from "../src/lib/data/maintenance";

const prisma = new PrismaClient();

// Slug måste matcha ASSOCIATION_SLUG i .env för dev-deployen.
const SLUG = process.env.ASSOCIATION_SLUG || "brf-exempelgarden";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function main() {
  // Nollställ denna förening (cascade tar bort all dess data) och skapa på nytt.
  await prisma.association.deleteMany({ where: { slug: SLUG } });
  const association = await prisma.association.create({
    data: { slug: SLUG, ...DEMO_ASSOCIATION_PROFILE },
  });
  const associationId = association.id;

  await prisma.member.createMany({
    data: [
      {
        associationId,
        email: DEMO_ASSOCIATION_PROFILE.contactEmail,
        fullName: "Anna Ordförande",
        role: "admin",
        status: "approved",
        createdAt: daysAgo(120),
      },
      {
        associationId,
        email: "boende@example.se",
        fullName: "Bertil Boende",
        role: "member",
        status: "approved",
        createdAt: daysAgo(60),
      },
      {
        associationId,
        email: "ny.granne@example.se",
        fullName: "Cecilia Nyinflyttad",
        role: "member",
        status: "pending",
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.newsPost.createMany({
    data: [
      {
        associationId,
        slug: "stamma-2026",
        title: "Kallelse till ordinarie föreningsstämma",
        excerpt:
          "Årets föreningsstämma hålls den 15 maj kl. 18:00 i gemensamhetslokalen. Motioner lämnas senast 1 april.",
        body: "Styrelsen kallar härmed samtliga medlemmar till ordinarie föreningsstämma.\n\n## Tid och plats\nOnsdag 15 maj kl. 18:00 i gemensamhetslokalen, plan 1.\n\n## Motioner\nMotioner ska vara styrelsen tillhanda senast den 1 april.",
        published: true,
        publishedAt: daysAgo(10),
        createdAt: daysAgo(10),
      },
      {
        associationId,
        slug: "stambyte-trapphus-b",
        title: "Stambyte i trapphus B – tidplan",
        excerpt:
          "Arbetet med stambytet i trapphus B påbörjas i september. Här är preliminär tidplan.",
        body: "Det efterlängtade stambytet i trapphus B närmar sig.\n\n## Preliminär tidplan\n- Vecka 36: Etablering och rivning\n- Vecka 38–44: Nya stammar och ytskikt\n- Vecka 45: Besiktning",
        published: true,
        publishedAt: daysAgo(25),
        createdAt: daysAgo(25),
      },
      {
        associationId,
        slug: "nya-cykelrum",
        title: "Nytt cykelrum invigt",
        excerpt: "Det nya cykelrummet i källaren är nu klart och öppet för alla boende.",
        body: "Vi är glada att meddela att det nya cykelrummet i källaren under trapphus A nu är klart.\n\nTaggen till din lägenhet ger tillträde.",
        published: true,
        publishedAt: daysAgo(40),
        createdAt: daysAgo(40),
      },
      {
        associationId,
        slug: "utkast-host",
        title: "Höstens gårdsstädning (utkast)",
        excerpt: "Planering för höstens gemensamma städdag.",
        body: "Utkast – datum spikas av styrelsen.",
        published: false,
        publishedAt: null,
        createdAt: daysAgo(1),
      },
    ],
  });

  // Grupperna är data, inte en enum – föreningen kan lägga till egna (t.ex.
  // "Trädgårdsgruppen") via /admin/styrelse.
  const styrelsen = await prisma.boardGroup.create({
    data: { associationId, name: "Styrelsen", sortOrder: 0 },
  });
  const valberedning = await prisma.boardGroup.create({
    data: { associationId, name: "Valberedning", sortOrder: 1 },
  });

  await prisma.boardMember.createMany({
    data: [
      { associationId, groupId: styrelsen.id, role: "Ordförande", name: "Anna Ordförande", email: "ordforande@brf-exempelgarden.se", sortOrder: 1 },
      { associationId, groupId: styrelsen.id, role: "Vice ordförande", name: "Björn Vice", email: "", sortOrder: 2 },
      { associationId, groupId: styrelsen.id, role: "Kassör", name: "Carina Kassör", email: "kassor@brf-exempelgarden.se", sortOrder: 3 },
      { associationId, groupId: styrelsen.id, role: "Sekreterare", name: "David Sekreterare", email: "", sortOrder: 4 },
      { associationId, groupId: styrelsen.id, role: "Ledamot", name: "Eva Ledamot", email: "", sortOrder: 5 },
      { associationId, groupId: styrelsen.id, role: "Suppleant", name: "Fredrik Suppleant", email: "", sortOrder: 6 },
      { associationId, groupId: valberedning.id, role: "Sammankallande", name: "Gunilla Valberedare", email: "valberedning@brf-exempelgarden.se", sortOrder: 1 },
      { associationId, groupId: valberedning.id, role: "Ledamot", name: "Hasse Valberedare", email: "", sortOrder: 2 },
    ],
  });

  // Demorader utan uppladdade filer: storagePath är tomt, vilket gör att de
  // visas i listan men inte går att ladda ner. Riktiga dokument laddas upp via
  // /admin/dokument, som lägger filen i den privata bucketen "documents".
  await prisma.document.createMany({
    data: [
      { associationId, title: "Stadgar", category: "stadgar", fileName: "stadgar-2023.pdf", storagePath: "", mimeType: "application/pdf", sizeBytes: 240_000, visibility: "public", uploadedAt: daysAgo(300) },
      { associationId, title: "Årsredovisning 2025", category: "arsredovisning", fileName: "arsredovisning-2025.pdf", storagePath: "", mimeType: "application/pdf", sizeBytes: 1_400_000, visibility: "public", uploadedAt: daysAgo(80) },
      { associationId, title: "Ordningsregler", category: "ordningsregler", fileName: "ordningsregler.pdf", storagePath: "", mimeType: "application/pdf", sizeBytes: 180_000, visibility: "public", uploadedAt: daysAgo(200) },
      { associationId, title: "Styrelseprotokoll mars 2026", category: "protokoll", fileName: "protokoll-2026-03.pdf", storagePath: "", mimeType: "application/pdf", sizeBytes: 120_000, visibility: "member", uploadedAt: daysAgo(30) },
      { associationId, title: "Styrelseprotokoll februari 2026", category: "protokoll", fileName: "protokoll-2026-02.pdf", storagePath: "", mimeType: "application/pdf", sizeBytes: 118_000, visibility: "member", uploadedAt: daysAgo(58) },
    ],
  });

  // Kategorierna är data, inte en enum – styrelsen lägger till egna i admin.
  const categories = new Map<string, string>();
  for (const [i, name] of DEFAULT_MAINTENANCE_CATEGORIES.entries()) {
    const row = await prisma.maintenanceCategory.create({
      data: { associationId, name, sortOrder: i + 1 },
    });
    categories.set(name, row.id);
  }

  await prisma.maintenanceSettings.create({
    data: { associationId, ...DEFAULT_MAINTENANCE_SETTINGS },
  });

  await prisma.maintenanceRequest.createMany({
    data: [
      {
        associationId,
        name: "Bertil Boende",
        email: "boende@example.se",
        phone: "070-123 45 67",
        categoryId: categories.get("Tvättstuga")!,
        location: "Tvättstuga plan 1, torktumlare 2",
        description: "Torktumlaren blir inte varm och kläderna förblir fuktiga.",
        status: "ny",
        createdAt: daysAgo(1),
      },
      {
        // Anmälan utan namn – bara telefon som kontaktväg.
        associationId,
        name: "",
        email: "",
        phone: "070-987 65 43",
        categoryId: categories.get("El / belysning")!,
        location: "Trapphus A, plan 2",
        description: "Belysningen i trapphuset blinkar.",
        status: "pagar",
        createdAt: daysAgo(6),
      },
    ],
  });

  await prisma.siteContent.create({
    data: { associationId, ...demoSiteContent(DEMO_ASSOCIATION_PROFILE) },
  });
  await prisma.associationInfo.create({
    data: { associationId, ...DEMO_ASSOCIATION_INFO },
  });

  // Demo-annons (styrelsehanterad, publicerad) så /till-salu inte är tom.
  await prisma.apartment.create({
    data: {
      associationId,
      number: "1105",
      floor: "4",
      rooms: "3 rok",
      sizeSqm: "72",
      description: "Ljus trea med balkong i västerläge.",
      forSale: true,
      listingStatus: "published",
      publishedAt: daysAgo(3),
      price: "3 250 000 kr",
      monthlyFee: "3 480 kr/mån",
      viewingInfo: "Söndag 24 augusti kl. 12.00–12.45. Anmäl dig till mäklaren.",
      saleDescription:
        "Välkommen till en ljus och välplanerad trea om 72 m² på fjärde våningen.\n\n## Planlösning\nRymligt vardagsrum med utgång till balkong i västerläge, separat kök och två bra sovrum.\n\n## Läge\nLugnt läge i föreningen med nära till kommunikationer och service.",
      brokerName: "Exempel Mäkleri – Karin Mäklare",
      brokerPhone: "08-765 43 21",
      brokerEmail: "karin@exempelmakleri.se",
      showFloorPlanPublicly: false,
    },
  });

  console.info(`✔ Seed klar för "${SLUG}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
