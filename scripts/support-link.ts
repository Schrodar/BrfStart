// Skapar en supportlänk till EN förenings adminpanel och skriver ut den.
// Kör: npm run support:link -- <förening-slug> <plattformsadmin-e-post> <sajtens-adress> ["anledning"]
//   t.ex. npm run support:link -- brf-pep anna@jnm.se https://brfpeppar.se "Lägger upp lägenheter och koder"
//
// Samma sak som Supportläge i JnM-panelen, för test och för när panelen inte
// går att använda. Hus, lägenheter, koder och admins nås bara i supportläget.
//
// Länken gäller i 15 minuter och kan bara användas en gång. Supportläget varar
// sedan i två timmar. Styrelsen ser sessionen och allt som ändrades under
// Admin → Supportlogg.

import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env";

loadEnv();

const LINK_MINUTES = 15;
const SESSION_HOURS = 2;
const USAGE =
  'Kör: npm run support:link -- <förening-slug> <plattformsadmin-e-post> <sajtens-adress> ["anledning"]';

const prisma = new PrismaClient();
const [slug, rawEmail, rawSite, rawReason] = process.argv
  .slice(2)
  .map((v) => v?.trim());
const email = rawEmail?.toLowerCase();
const site = rawSite?.replace(/\/+$/, "");

if (!slug || !email || !site) {
  console.error(USAGE);
  process.exit(1);
}
if (!site.startsWith("https://") && !site.startsWith("http://localhost")) {
  console.error("Sajtens adress måste börja med https:// (eller http://localhost).");
  process.exit(1);
}

async function main() {
  const association = await prisma.association.findUnique({ where: { slug: slug! } });
  if (!association) {
    console.error(`Ingen förening med slug "${slug}".`);
    process.exit(1);
  }

  const admin = await prisma.platformAdmin.findFirst({
    where: { email: { equals: email!, mode: "insensitive" }, disabledAt: null },
  });
  if (!admin) {
    console.error(`${email} är ingen aktiv plattformsadmin.`);
    process.exit(1);
  }

  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await prisma.supportSession.create({
    data: {
      associationId: association.id,
      platformAdminId: admin.id,
      adminName: admin.name || admin.email,
      adminEmail: admin.email,
      // Styrelsen läser anledningen i supportloggen.
      reason: rawReason || "Underhåll av lägenheter och koder",
      tokenHash: createHash("sha256").update(token).digest("hex"),
      linkExpiresAt: new Date(now + LINK_MINUTES * 60_000),
      expiresAt: new Date(now + SESSION_HOURS * 3_600_000),
    },
  });

  console.info(`✔ Supportlänk till "${slug}" för ${admin.email}.`);
  console.info(
    `  Öppna den inom ${LINK_MINUTES} minuter – den kan bara användas en gång. Supportläget varar i ${SESSION_HOURS} timmar:`,
  );
  console.info(`  ${site}/admin/support?token=${token}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
