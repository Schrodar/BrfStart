// Bjuder in en styrelseadmin till EN förening och skriver ut aktiveringslänken.
// Kör: npx tsx scripts/invite-admin.ts <förening-slug> <e-post> <sajtens-adress> [namn]
//   t.ex. npx tsx scripts/invite-admin.ts brf-pep anna@example.se https://brfpeppar.netlify.app "Anna Andersson"
//
// Samma sak som "Bjud in" i JnM-panelen, för när panelen inte går att använda.
// Ersätter promote-admin.ts, som skapade admin-raden direkt: då kunde den som
// först registrerade e-postadressen välja lösenordet och ta över platsen. Här
// skapas bara en inbjudan – kontot och medlemmen skapas först när personen
// öppnar länken och väljer sitt lösenord på /aktivera.

import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env";

loadEnv();

const INVITE_DAYS = 7;
const USAGE =
  "Kör: npx tsx scripts/invite-admin.ts <förening-slug> <e-post> <sajtens-adress> [namn]";

const prisma = new PrismaClient();
const [slug, rawEmail, rawSite, rawName] = process.argv.slice(2).map((v) => v?.trim());
const email = rawEmail?.toLowerCase();
const site = rawSite?.replace(/\/+$/, "");

if (!slug || !email || !site) {
  console.error(USAGE);
  process.exit(1);
}
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(`Ogiltig e-postadress: ${email}`);
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

  const existingAdmin = await prisma.member.findFirst({
    where: {
      associationId: association.id,
      role: "admin",
      email: { equals: email!, mode: "insensitive" },
    },
  });
  if (existingAdmin) {
    console.error(`${email} är redan admin i "${slug}".`);
    process.exit(1);
  }

  const token = randomBytes(32).toString("hex");
  await prisma.memberInvitation.create({
    data: {
      associationId: association.id,
      email: email!,
      fullName: rawName || email!.split("@")[0],
      role: "admin",
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
    },
  });

  console.info(`✔ Inbjudan skapad för ${email} som admin i "${slug}".`);
  console.info(`  Skicka länken till personen. Den gäller i ${INVITE_DAYS} dagar och kan bara användas en gång:`);
  console.info(`  ${site}/aktivera?token=${token}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
