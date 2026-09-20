// Skapar två kompletta demo-föreningar med styrelse, medlemmar och riktiga
// inloggningskonton (Supabase Auth). Rerunnable (uppdaterar lösenord om konton finns).
// Kör: npx tsx scripts/seed-demo-tenants.ts
//
// Kräver DEMO_PASSWORD i .env.local – lösenordet till demokontona ligger inte
// i koden, eftersom kontona finns på riktigt i Supabase.

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { DEMO_ASSOCIATION_INFO } from "../src/lib/data/defaults";
import {
  DEFAULT_MAINTENANCE_CATEGORIES,
  DEFAULT_MAINTENANCE_SETTINGS,
} from "../src/lib/data/maintenance";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    // ignore
  }
}
loadEnv(".env.local");
loadEnv(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Saknar NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

// Demokontona finns på riktigt i Supabase, så lösenordet hör inte hemma i
// koden. Samma lösenord används för alla demokonton.
const demoPassword = process.env.DEMO_PASSWORD ?? "";
if (!demoPassword) {
  console.error(
    "Saknar DEMO_PASSWORD. Sätt det i .env.local innan du seedar demoföreningarna.",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(url, key, { auth: { persistSession: false } });
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function ensureAuthUser(email: string, password: string) {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) return;
  const { data } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existing = data.users.find(
    (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
  }
}

interface Person {
  email: string;
  fullName: string;
  apartment: string;
}
interface TenantCfg {
  slug: string;
  name: string;
  organizationNumber: string;
  city: string;
  street: string;
  postalCode: string;
  /** Utelämnad = föreningen sköter förvaltningen själv (förvaltarrutorna döljs). */
  propertyManager?: { name: string; phone: string; email: string };
  admin: Person;
  boende: Person;
  /** Gruppnamnet skapas som en BoardGroup-rad. Fritt val, t.ex. "Trädgårdsgruppen". */
  board: { group: string; role: string; name: string; email?: string }[];
  pending: { email: string; fullName: string; apartment: string }[];
  news: { slug: string; title: string; excerpt: string; body: string; days: number }[];
  listing: {
    number: string;
    floor: string;
    rooms: string;
    sizeSqm: string;
    price: string;
    monthlyFee: string;
    saleDescription: string;
    viewingInfo: string;
    brokerName: string;
    brokerPhone: string;
    brokerEmail: string;
  };
}

async function seedTenant(cfg: TenantCfg) {
  // Identiteten – namn, adress och kontakt – visas i header och footer.
  const identity = {
    name: cfg.name,
    organizationNumber: cfg.organizationNumber,
    street: cfg.street,
    postalCode: cfg.postalCode,
    city: cfg.city,
    contactEmail: cfg.admin.email,
    propertyManagerName: cfg.propertyManager?.name ?? "",
    propertyManagerPhone: cfg.propertyManager?.phone ?? "",
    propertyManagerEmail: cfg.propertyManager?.email ?? "",
  };
  const assoc = await prisma.association.upsert({
    where: { slug: cfg.slug },
    update: identity,
    create: { slug: cfg.slug, ...identity },
  });
  const associationId = assoc.id;

  // Rensa föreningens data (rerunnable).
  await prisma.apartmentPhoto.deleteMany({ where: { apartment: { associationId } } });
  await prisma.apartment.deleteMany({ where: { associationId } });
  await prisma.newsPost.deleteMany({ where: { associationId } });
  // Personerna först: BoardGroup har onDelete: Restrict.
  await prisma.boardMember.deleteMany({ where: { associationId } });
  await prisma.boardGroup.deleteMany({ where: { associationId } });
  await prisma.document.deleteMany({ where: { associationId } });
  // Ärendena först: MaintenanceCategory har onDelete: Restrict.
  await prisma.maintenanceRequest.deleteMany({ where: { associationId } });
  await prisma.maintenanceCategory.deleteMany({ where: { associationId } });
  await prisma.maintenanceSettings.deleteMany({ where: { associationId } });
  await prisma.member.deleteMany({ where: { associationId } });
  await prisma.siteContent.deleteMany({ where: { associationId } });
  await prisma.associationInfo.deleteMany({ where: { associationId } });
  await prisma.economyFigures.deleteMany({ where: { associationId } });

  await prisma.siteContent.create({
    data: {
      associationId,
      heroTitle: `Välkommen till ${cfg.name}`,
      heroSubtitle: `Ett trivsamt boende i ${cfg.city}.`,
      welcomeBody: `Här samlar ${cfg.name} nyheter, dokument, felanmälan för de boende.`,
      aboutBody: `${cfg.name} är en bostadsrättsförening i ${cfg.city}.\n\n## Fastigheten\nFöreningen förvaltar fastigheten på ${cfg.street} med gemensam tvättstuga, cykelrum och innergård.`,
    },
  });
  await prisma.associationInfo.create({
    data: { associationId, ...DEMO_ASSOCIATION_INFO },
  });
  await prisma.maintenanceSettings.create({
    data: { associationId, ...DEFAULT_MAINTENANCE_SETTINGS },
  });
  for (const [i, name] of DEFAULT_MAINTENANCE_CATEGORIES.entries()) {
    await prisma.maintenanceCategory.create({
      data: { associationId, name, sortOrder: i + 1 },
    });
  }

  // Grupperna är rader, inte enum-värden: skapa dem i den ordning de dyker upp
  // i konfigurationen och koppla personerna till rätt grupp.
  const groupIds = new Map<string, string>();
  for (const b of cfg.board) {
    if (groupIds.has(b.group)) continue;
    const g = await prisma.boardGroup.create({
      data: { associationId, name: b.group, sortOrder: groupIds.size },
    });
    groupIds.set(b.group, g.id);
  }

  await prisma.boardMember.createMany({
    data: cfg.board.map((b, i) => ({
      associationId,
      groupId: groupIds.get(b.group)!,
      role: b.role,
      name: b.name,
      email: b.email ?? "",
      sortOrder: i,
    })),
  });

  await ensureAuthUser(cfg.admin.email, demoPassword);
  await ensureAuthUser(cfg.boende.email, demoPassword);

  await prisma.member.createMany({
    data: [
      {
        associationId,
        email: cfg.admin.email,
        fullName: cfg.admin.fullName,
        apartment: cfg.admin.apartment,
        role: "admin",
        status: "approved",
        canManageListing: true,
        createdAt: daysAgo(90),
      },
      {
        associationId,
        email: cfg.boende.email,
        fullName: cfg.boende.fullName,
        apartment: cfg.boende.apartment,
        role: "member",
        status: "approved",
        canManageListing: true,
        createdAt: daysAgo(45),
      },
      ...cfg.pending.map((p) => ({
        associationId,
        email: p.email,
        fullName: p.fullName,
        apartment: p.apartment,
        role: "member" as const,
        status: "pending" as const,
        canManageListing: false,
        createdAt: daysAgo(2),
      })),
    ],
  });

  await prisma.newsPost.createMany({
    data: cfg.news.map((n) => ({
      associationId,
      slug: n.slug,
      title: n.title,
      excerpt: n.excerpt,
      body: n.body,
      published: true,
      publishedAt: daysAgo(n.days),
      createdAt: daysAgo(n.days),
    })),
  });

  await prisma.apartment.create({
    data: {
      associationId,
      number: cfg.listing.number,
      floor: cfg.listing.floor,
      rooms: cfg.listing.rooms,
      sizeSqm: cfg.listing.sizeSqm,
      description: "",
      forSale: true,
      listingStatus: "published",
      publishedAt: daysAgo(2),
      price: cfg.listing.price,
      monthlyFee: cfg.listing.monthlyFee,
      saleDescription: cfg.listing.saleDescription,
      viewingInfo: cfg.listing.viewingInfo,
      brokerName: cfg.listing.brokerName,
      brokerPhone: cfg.listing.brokerPhone,
      brokerEmail: cfg.listing.brokerEmail,
      showFloorPlanPublicly: false,
    },
  });

  console.info(`✔ ${cfg.name} (${cfg.slug}) klar.`);
}

const tenants: TenantCfg[] = [
  {
    slug: "brf-solglantan",
    name: "Brf Solgläntan",
    organizationNumber: "769600-1111",
    city: "Solstaden",
    street: "Solvägen 3",
    postalCode: "111 22",
    propertyManager: {
      name: "Solstadens Förvaltning AB",
      phone: "08-222 33 44",
      email: "kundtjanst@solforvaltning.se",
    },
    admin: { email: "styrelse@solglantan.se", fullName: "Sara Ordförande", apartment: "1201" },
    boende: { email: "boende@solglantan.se", fullName: "Sven Boende", apartment: "0302" },
    board: [
      { group: "Styrelsen", role: "Ordförande", name: "Sara Ordförande", email: "styrelse@solglantan.se" },
      { group: "Styrelsen", role: "Kassör", name: "Karl Kassör" },
      { group: "Styrelsen", role: "Sekreterare", name: "Sofia Sekreterare" },
      { group: "Styrelsen", role: "Ledamot", name: "Lars Ledamot" },
      { group: "Valberedning", role: "Sammankallande", name: "Vera Valberedare" },
    ],
    pending: [{ email: "nina.ny@solglantan.se", fullName: "Nina Nyinflyttad", apartment: "0405" }],
    news: [
      { slug: "sommarfest", title: "Sommarfest på innergården", excerpt: "Välkommen på grillfest lördag 16 augusti.", body: "Alla boende hälsas välkomna till sommarfesten på innergården.\n\nTa med något att grilla – föreningen bjuder på dryck.", days: 5 },
      { slug: "atervinning", title: "Ny återvinningsstation i källaren", excerpt: "Nu kan du sortera glas, metall och kartong i källaren.", body: "Den nya återvinningsstationen är på plats i källaren under trapphus A.", days: 20 },
    ],
    listing: { number: "1105", floor: "4", rooms: "3 rok", sizeSqm: "72", price: "3 195 000 kr", monthlyFee: "3 480 kr/mån", saleDescription: "Ljus och välplanerad trea med balkong i västerläge.", viewingInfo: "Sön 24 aug kl. 12–12.45.", brokerName: "Solstadens Mäkleri – Karin", brokerPhone: "08-111 22 33", brokerEmail: "karin@solmakleri.se" },
  },
  {
    slug: "brf-bjorken",
    name: "Brf Björken",
    organizationNumber: "769600-2222",
    city: "Lundaby",
    street: "Björkgatan 8",
    postalCode: "222 33",
    admin: { email: "styrelse@bjorken.se", fullName: "Björn Ordförande", apartment: "0101" },
    boende: { email: "boende@bjorken.se", fullName: "Bodil Boende", apartment: "0204" },
    board: [
      { group: "Styrelsen", role: "Ordförande", name: "Björn Ordförande", email: "styrelse@bjorken.se" },
      { group: "Styrelsen", role: "Kassör", name: "Kerstin Kassör" },
      { group: "Styrelsen", role: "Ledamot", name: "Leif Ledamot" },
      { group: "Styrelsen", role: "Suppleant", name: "Sonja Suppleant" },
      { group: "Valberedning", role: "Sammankallande", name: "Valter Valberedare" },
    ],
    pending: [{ email: "nils.ny@bjorken.se", fullName: "Nils Nyinflyttad", apartment: "0310" }],
    news: [
      { slug: "stamspolning", title: "Stamspolning i höst", excerpt: "Föreningen genomför stamspolning i oktober.", body: "Stamspolning av avloppen genomförs vecka 42. Mer information kommer i brevlådan.", days: 8 },
      { slug: "cykelstall", title: "Nya cykelställ vid entrén", excerpt: "Fler cykelplatser är nu på plats utanför entrén.", body: "Vi har kompletterat med nya cykelställ vid huvudentrén.", days: 25 },
    ],
    listing: { number: "0405", floor: "2", rooms: "2 rok", sizeSqm: "54", price: "2 450 000 kr", monthlyFee: "2 950 kr/mån", saleDescription: "Charmig tvåa i lugnt läge med öppen planlösning.", viewingInfo: "Ons 27 aug kl. 17.30–18.", brokerName: "Lundaby Bostad – Peter", brokerPhone: "046-44 55 66", brokerEmail: "peter@lundabybostad.se" },
  },
];

async function main() {
  for (const t of tenants) await seedTenant(t);
  console.info("Klar.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
