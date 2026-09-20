// Gör en användare till admin (styrelse) + godkänd medlem i EN förening.
// Kör: npx tsx scripts/promote-admin.ts <förening-slug> <e-post>
//
// Kopplas till Supabase-auth-användaren via e-post. Användaren måste finnas i
// Supabase Auth (via appens registrering eller Supabase-dashboarden) – detta
// script sätter bara profilens roll/status i Member-tabellen för given förening.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const slug = process.argv[2]?.trim();
const email = process.argv[3]?.trim().toLowerCase();

if (!slug || !email) {
  console.error("Kör: npx tsx scripts/promote-admin.ts <förening-slug> <e-post>");
  process.exit(1);
}

async function main() {
  const association = await prisma.association.findUnique({
    where: { slug: slug! },
  });
  if (!association) {
    console.error(`Ingen förening med slug "${slug}".`);
    process.exit(1);
  }

  const member = await prisma.member.upsert({
    where: { associationId_email: { associationId: association.id, email: email! } },
    update: { role: "admin", status: "approved" },
    create: {
      associationId: association.id,
      email: email!,
      fullName: email!.split("@")[0],
      apartment: "",
      role: "admin",
      status: "approved",
    },
  });
  console.info(`✔ ${member.email} är nu admin (godkänd) i "${slug}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
