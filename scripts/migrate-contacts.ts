// Flyttar underleverantörerna från felanmälningskategorierna till
// kontaktregistret (Contact och ContactCategory), per förening.
//
//   npm run contacts:migrate               visar bara vad som skulle hända
//   npm run contacts:migrate -- --bekrafta skapar kontakterna
//
// Körs när adminvyn har bytt till kontaktregistret. Innan dess redigeras
// underleverantörerna fortfarande på kategorierna, och en tidig kopia skulle
// bli inaktuell.
//
// Samma underleverantör på flera kategorier (samma namn, telefon och e-post)
// blir EN kontakt, kopplad till alla kategorierna. Finns den redan i registret
// kopplas kategorierna dit. En kategori som redan har en kontakt hoppas över,
// så skriptet går att köra flera gånger.
//
// Kontakterna får typen leverantor och syns bara för styrelsen, precis som
// fälten på kategorin. Kategoriernas fält rörs inte. De tas bort ur schemat
// först när inget läser dem längre.

import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { loadEnv } from "./load-env";

loadEnv();

const confirm = process.argv.includes("--bekrafta");
const prisma = new PrismaClient();

interface Group {
  /** Befintlig kontakt att koppla till. Null = en ny skapas. */
  existingId: string | null;
  name: string;
  phone: string;
  email: string;
  infos: string[];
  categories: { id: string; name: string }[];
}

/** Känner igen samma underleverantör trots mellanslag, skiftläge och bindestreck. */
function identity(name: string, phone: string, email: string): string {
  return [
    name.trim().toLowerCase().replace(/\s+/g, " "),
    phone.replace(/[^\d+]/g, ""),
    email.trim().toLowerCase(),
  ].join("|");
}

async function main() {
  const associations = await prisma.association.findMany({
    select: { id: true, slug: true },
    orderBy: { slug: "asc" },
  });

  let created = 0;
  let reused = 0;
  let links = 0;

  for (const { id: associationId, slug } of associations) {
    const categories = await prisma.maintenanceCategory.findMany({
      // Kategorier som redan har en kontakt är klara.
      where: { associationId, contacts: { none: {} } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        contractorName: true,
        contractorPhone: true,
        contractorEmail: true,
        contractorInfo: true,
      },
    });

    const existing = new Map<string, string>();
    const contacts = await prisma.contact.findMany({
      where: { associationId },
      select: { id: true, name: true, phone: true, email: true },
    });
    for (const c of contacts) existing.set(identity(c.name, c.phone, c.email), c.id);

    const groups = new Map<string, Group>();
    for (const category of categories) {
      const name = category.contractorName.trim();
      const phone = category.contractorPhone.trim();
      const email = category.contractorEmail.trim();
      const info = category.contractorInfo.trim();
      if (!name && !phone && !email && !info) continue;

      // Bara fritext: en kontakt per text, så att olika texter inte slås ihop.
      const key = identity(name, phone, email) + (name || phone || email ? "" : `|${info}`);
      const group = groups.get(key) ?? {
        existingId: existing.get(key) ?? null,
        name,
        phone,
        email,
        infos: [],
        categories: [],
      };
      if (info && !group.infos.includes(info)) group.infos.push(info);
      group.categories.push({ id: category.id, name: category.name });
      groups.set(key, group);
    }
    if (groups.size === 0) continue;

    console.log(`${slug}:`);
    const writes: Prisma.PrismaPromise<unknown>[] = [];
    for (const group of groups.values()) {
      const categoryNames = group.categories.map((c) => c.name).join(", ");
      // Namnet krävs. Saknas det heter kontakten efter kategorierna tills
      // styrelsen byter.
      const name = group.name || `Underleverantör för ${categoryNames}`;
      const contactId = group.existingId ?? randomUUID();

      if (group.existingId) {
        reused++;
        console.log(`  = ${name} (finns redan) → ${categoryNames}`);
      } else {
        created++;
        console.log(`  + ${name} → ${categoryNames}`);
        writes.push(
          prisma.contact.create({
            data: {
              id: contactId,
              associationId,
              name,
              phone: group.phone,
              email: group.email,
              info: group.infos.join("\n\n"),
              type: "leverantor",
              visibleToMembers: false,
            },
          }),
        );
      }
      links += group.categories.length;
      writes.push(
        prisma.contactCategory.createMany({
          data: group.categories.map((c) => ({
            associationId,
            contactId,
            categoryId: c.id,
          })),
          skipDuplicates: true,
        }),
      );
    }

    // En transaktion per förening: allt eller inget.
    if (confirm) await prisma.$transaction(writes);
  }

  const summary = `${created} nya kontakter, ${reused} befintliga, ${links} kategorier kopplade`;
  if (created + reused === 0) console.log("Inga underleverantörer att flytta.");
  else if (!confirm) console.log(`\nTorrkörning: ${summary}. Lägg till --bekrafta för att skapa dem.`);
  else console.log(`\nKlart: ${summary}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
