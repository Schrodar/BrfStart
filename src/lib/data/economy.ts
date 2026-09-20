import type { Prisma } from "@prisma/client";
import type { ApartmentArea, EconomyFigures } from "@/lib/types";
import { sumAreas } from "@/lib/key-figures";
import { getTenantDb } from "@/lib/tenant";
import { EMPTY_ECONOMY_FIGURES } from "./defaults";

/**
 * Läser lägenhetslistan ur JSON-kolumnen. Defensivt: en rad som ändrats för
 * hand i databasen ska inte fälla adminsidan – ogiltiga poster hoppas över.
 */
function toApartmentAreas(json: Prisma.JsonValue): ApartmentArea[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { label, sqm } = item;
    if (typeof label !== "string" || typeof sqm !== "number") return [];
    if (!Number.isFinite(sqm) || sqm <= 0) return [];
    return [{ label, sqm }];
  });
}

export async function getEconomyFigures(): Promise<EconomyFigures> {
  const { db } = await getTenantDb();
  const row = await db.economyFigures.findFirst({});
  if (!row) return EMPTY_ECONOMY_FIGURES;

  const apartmentAreas = toApartmentAreas(row.apartmentAreas);
  return {
    fiscalYear: row.fiscalYear,
    annualFees: row.annualFees,
    // Finns det lägenheter är deras summa bostadsrättsytan – samma regel som
    // när formuläret sparar. Tillämpas även vid läsning, så att admin och
    // /ekonomi aldrig kan visa olika tal om raden ändrats på annat sätt.
    condoArea: apartmentAreas.length > 0 ? sumAreas(apartmentAreas) : row.condoArea,
    interestBearingDebt: row.interestBearingDebt,
    totalArea: row.totalArea,
    netResult: row.netResult,
    depreciation: row.depreciation,
    plannedMaintenance: row.plannedMaintenance,
    disposals: row.disposals,
    nonRecurring: row.nonRecurring,
    apartmentAreas,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type EconomyFiguresInput = Omit<EconomyFigures, "updatedAt">;

/** Sparar underlaget. Validering sker i anroparen (src/lib/key-figures.ts). */
export async function saveEconomyFigures(
  input: EconomyFiguresInput,
): Promise<void> {
  const { db, associationId } = await getTenantDb();
  const data = {
    ...input,
    // Nya objekt med bara de två fälten – inget annat ska hamna i JSON:en.
    apartmentAreas: input.apartmentAreas.map(({ label, sqm }) => ({
      label,
      sqm,
    })),
  };
  await db.economyFigures.upsert({
    where: { associationId },
    create: { associationId, ...data },
    update: data,
  });
}
