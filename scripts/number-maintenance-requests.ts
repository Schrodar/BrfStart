// Ger felanmälningar som skapades före numreringen ett löpnummer (#1, #2 …),
// i den ordning de kom in, per förening. Nya ärenden numreras när de skapas.
//
//   npm run maintenance:number               visar bara vad som skulle hända
//   npm run maintenance:number -- --bekrafta numrerar dem
//
// Ärenden som redan har nummer rörs inte; de onumrerade får numren efter
// föreningens högsta. Går att köra flera gånger.

import { PrismaClient } from "@prisma/client";
import { loadEnv } from "./load-env";

loadEnv();

const confirm = process.argv.includes("--bekrafta");
const prisma = new PrismaClient();

async function main() {
  const associations = await prisma.association.findMany({
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  let total = 0;
  for (const association of associations) {
    const unnumbered = await prisma.maintenanceRequest.findMany({
      where: { associationId: association.id, number: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (unnumbered.length === 0) continue;

    const max = await prisma.maintenanceRequest.aggregate({
      where: { associationId: association.id },
      _max: { number: true },
    });
    const first = (max._max.number ?? 0) + 1;
    const last = first + unnumbered.length - 1;
    console.log(
      `${association.slug}: ${unnumbered.length} ärenden får #${first}–#${last}`,
    );
    total += unnumbered.length;

    if (!confirm) continue;
    await prisma.$transaction(
      unnumbered.map((r, i) =>
        prisma.maintenanceRequest.update({
          where: { id: r.id },
          data: { number: first + i },
        }),
      ),
    );
  }

  if (total === 0) console.log("Alla ärenden har redan nummer.");
  else if (!confirm) console.log("\nTorrkörning. Lägg till --bekrafta för att numrera.");
  else console.log(`\nKlart: ${total} ärenden numrerade.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
