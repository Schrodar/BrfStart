import type { Building as DbBuilding } from "@prisma/client";
import type { Building, BuildingWithCounts } from "@/lib/types";
import { getTenantDb } from "@/lib/tenant";
import { buildApartmentNumbers, type NumberingInput } from "@/lib/numbering";

/** Bara siffror, minst en. Tomt fält faller tillbaka på "1". */
function normalizeStart(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : "1";
}

function toBuilding(b: DbBuilding): Building {
  return {
    id: b.id,
    name: b.name,
    address: b.address,
    order: b.sortOrder,
    numberStart: b.numberStart,
    numberTopDown: b.numberTopDown,
  };
}

export interface BuildingInput {
  name: string;
  address: string;
  /** Första föreningsnumret vid massinläggning i huset, t.ex. "23". */
  numberStart: string;
  numberTopDown: boolean;
}

export async function getBuildings(): Promise<Building[]> {
  const { db } = await getTenantDb();
  const rows = await db.building.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toBuilding);
}

/** Husen med räknare – underlaget för översiktskorten i registret. */
export async function getBuildingsWithCounts(): Promise<BuildingWithCounts[]> {
  const { db } = await getTenantDb();
  const rows = await db.building.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { apartments: true } },
      apartments: { where: { forSale: true }, select: { id: true } },
    },
  });
  return rows.map((b) => ({
    ...toBuilding(b),
    apartmentCount: b._count.apartments,
    forSaleCount: b.apartments.length,
  }));
}

/**
 * Nästa lediga föreningsnummer – föreningsnumren löper genom hela föreningen,
 * så massinläggning i ett nytt hus fortsätter där förra huset slutade.
 * Numeriska nummer räknas; egna format ("12B") räknas inte in.
 */
export async function getNextApartmentNumber(): Promise<string> {
  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({ select: { number: true } });
  const highest = rows.reduce((max, r) => {
    const n = Number.parseInt(r.number, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return String(highest + 1);
}

export async function getBuildingById(id: string): Promise<Building | null> {
  const { db } = await getTenantDb();
  const row = await db.building.findFirst({ where: { id } });
  return row ? toBuilding(row) : null;
}

export type BuildingResult =
  | { ok: true; building: Building }
  | { ok: false; error: string };

export async function createBuilding(
  input: BuildingInput,
): Promise<BuildingResult> {
  const { db, associationId } = await getTenantDb();
  const { name, address } = input;
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ange ett namn på huset." };

  const existing = await db.building.findFirst({ where: { name: trimmed } });
  if (existing) return { ok: false, error: `"${trimmed}" finns redan.` };

  const last = await db.building.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const row = await db.building.create({
    data: {
      associationId,
      name: trimmed,
      address: address.trim(),
      numberStart: normalizeStart(input.numberStart),
      numberTopDown: input.numberTopDown,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  return { ok: true, building: toBuilding(row) };
}

export async function updateBuilding(
  id: string,
  input: BuildingInput,
): Promise<BuildingResult> {
  const { db } = await getTenantDb();
  const { name, address } = input;
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ange ett namn på huset." };

  const clash = await db.building.findFirst({
    where: { name: trimmed, NOT: { id } },
  });
  if (clash) return { ok: false, error: `"${trimmed}" finns redan.` };

  await db.building.updateMany({
    where: { id },
    data: {
      name: trimmed,
      address: address.trim(),
      numberStart: normalizeStart(input.numberStart),
      numberTopDown: input.numberTopDown,
    },
  });
  const row = await db.building.findFirst({ where: { id } });
  if (!row) return { ok: false, error: "Huset hittades inte." };
  return { ok: true, building: toBuilding(row) };
}

/**
 * Tar bort ett hus OCH dess lägenheter.
 *
 * Lägenheterna följer med med flit: ett hus utan lägenheter är inte ett hus,
 * och alternativet – att lämna dem kvar utan husplacering – gav en hög rader
 * under "Ej placerade" som ingen bad om. Foton och planritningar ligger i
 * Storage och städas inte av databasen, så sökvägarna returneras för att
 * anropande server action ska kunna radera filerna.
 */
export async function deleteBuilding(id: string): Promise<
  | { ok: true; apartments: number; floorPlanPaths: string[]; photoPaths: string[] }
  | { ok: false; error: string }
> {
  const { db } = await getTenantDb();
  const building = await db.building.findFirst({ where: { id } });
  if (!building) return { ok: false, error: "Huset hittades inte." };

  const apartments = await db.apartment.findMany({
    where: { buildingId: id },
    include: { photos: true },
  });

  const floorPlanPaths = apartments
    .map((a) => a.floorPlanPath)
    .filter((path): path is string => Boolean(path));
  const photoPaths = apartments.flatMap((a) => a.photos.map((ph) => ph.path));

  // Lägenheterna först – Building_apartments är SetNull, så de skulle annars
  // bli kvar som ej placerade i stället för att försvinna.
  await db.apartment.deleteMany({ where: { buildingId: id } }); // cascade → foton
  await db.building.deleteMany({ where: { id } });

  return { ok: true, apartments: apartments.length, floorPlanPaths, photoPaths };
}

export async function reorderBuildings(
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db } = await getTenantDb();
  const own = await db.building.findMany({ select: { id: true } });
  const ownIds = new Set(own.map((b) => b.id));

  const ids = orderedIds.filter((id) => ownIds.has(id));
  if (ids.length !== ownIds.size) {
    return { ok: false, error: "Ordningen matchar inte husen. Ladda om sidan." };
  }
  await Promise.all(
    ids.map((id, i) =>
      db.building.updateMany({ where: { id }, data: { sortOrder: i + 1 } }),
    ),
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Massinläggning
// ---------------------------------------------------------------------------

export interface BulkApartmentInput extends NumberingInput {
  buildingId: string;
}

// Numren byggs av buildApartmentNumbers i @/lib/numbering – samma funktion som
// formulärets förhandsvisning använder, så förhandsvisning och resultat matchar.

export interface BulkResult {
  created: number;
  /** Nummer som redan fanns och därför hoppades över. */
  skipped: string[];
}

export async function createApartmentsInBulk(
  input: BulkApartmentInput,
): Promise<{ ok: true; result: BulkResult } | { ok: false; error: string }> {
  if (input.floors.length === 0) {
    return { ok: false, error: "Ange ett giltigt våningsintervall." };
  }
  if (input.floors.some((f) => f.count < 0)) {
    return { ok: false, error: "Antalet kan inte vara negativt." };
  }
  if (input.floors.every((f) => f.count === 0)) {
    return { ok: false, error: "Ange minst en lägenhet på någon våning." };
  }

  const { db, associationId } = await getTenantDb();
  const building = await db.building.findFirst({
    where: { id: input.buildingId },
  });
  if (!building) return { ok: false, error: "Huset hittades inte." };

  const planned = buildApartmentNumbers(input);
  if (planned.length > 300) {
    return { ok: false, error: "För många lägenheter på en gång (max 300)." };
  }
  if (planned.some((p) => !p.standardNumber)) {
    return {
      ok: false,
      error: "Någon våning ligger utanför skalan (entré = 10, som mest 00–99).",
    };
  }

  // Föreningsnumret är unikt per förening – befintliga hoppas över i stället
  // för att spränga hela inläggningen.
  const existing = await db.apartment.findMany({
    where: { number: { in: planned.map((p) => p.number) } },
    select: { number: true },
  });
  const taken = new Set(existing.map((e) => e.number));
  const fresh = planned.filter((p) => !taken.has(p.number));

  if (fresh.length > 0) {
    await db.apartment.createMany({
      data: fresh.map((p) => ({
        associationId,
        buildingId: input.buildingId,
        number: p.number,
        standardNumber: p.standardNumber,
        floor: String(p.floor),
      })),
    });
  }

  return {
    ok: true,
    result: {
      created: fresh.length,
      skipped: planned.filter((p) => taken.has(p.number)).map((p) => p.number),
    },
  };
}
