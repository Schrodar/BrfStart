"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { saveEconomyFigures } from "@/lib/data";
import {
  FIGURES,
  INPUT_IDS,
  INPUTS,
  checkInputs,
  computeFigures,
  sumAreas,
  type RawValues,
} from "@/lib/key-figures";
import type { ApartmentArea } from "@/lib/types";
import type { EconomyFormState } from "./form-state";

const MAX_APARTMENTS = 2000;
const MAX_LABEL = 40;
const MAX_FISCAL_YEAR = 20;

/**
 * Lägenhetslistan kommer som JSON från ett dolt fält. Den byggs av vårt eget
 * formulär, så allt som inte ser ut som det formuläret skickar avvisas i sin
 * helhet i stället för att lagas.
 */
function readApartmentAreas(value: FormDataEntryValue | null): ApartmentArea[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value ?? "[]"));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length > MAX_APARTMENTS) return null;

  const seen = new Set<string>();
  const list: ApartmentArea[] = [];
  for (const item of parsed) {
    const { label, sqm } = (item ?? {}) as { label?: unknown; sqm?: unknown };
    if (typeof label !== "string" || typeof sqm !== "number") return null;
    const trimmed = label.trim();
    if (!trimmed || trimmed.length > MAX_LABEL) return null;
    if (!Number.isFinite(sqm) || sqm <= 0) return null;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    list.push({ label: trimmed, sqm });
  }
  return list;
}

export async function saveEconomyFiguresAction(
  prev: EconomyFormState,
  formData: FormData,
): Promise<EconomyFormState> {
  await requireAdmin();

  // Ett misslyckat försök ändrar inte vad som senast sparades.
  const fail = (error: string): EconomyFormState => ({
    error,
    savedKey: prev.savedKey,
  });

  const apartmentAreas = readApartmentAreas(formData.get("apartmentAreas"));
  if (!apartmentAreas) {
    return fail("Lägenhetslistan kunde inte läsas. Ladda om sidan och försök igen.");
  }

  const raw = Object.fromEntries(
    INPUT_IDS.map((id) => [id, String(formData.get(id) ?? "")]),
  ) as RawValues;
  // Finns det lägenheter är det deras summa som gäller, inte det som råkar
  // stå i fältet.
  if (apartmentAreas.length > 0) {
    raw.condoArea = String(sumAreas(apartmentAreas));
  }

  // Samma kontroll som knappen Beräkna gör i webbläsaren – den går att kringgå,
  // den här gör det inte.
  const { values, errors } = checkInputs(raw);
  const firstError = INPUT_IDS.find((id) => errors[id]);
  if (firstError) {
    return fail(`${INPUTS[firstError].label}: ${errors[firstError]}`);
  }

  const fiscalYear = String(formData.get("fiscalYear") ?? "").trim();
  const published = computeFigures(values, errors).filter(
    (r) => r.status === "ok",
  ).length;
  if (published > 0 && !fiscalYear) {
    return fail("Ange vilket räkenskapsår siffrorna gäller.");
  }
  if (fiscalYear.length > MAX_FISCAL_YEAR) {
    return fail(`Räkenskapsåret får vara högst ${MAX_FISCAL_YEAR} tecken.`);
  }

  await saveEconomyFigures({ fiscalYear, ...values, apartmentAreas });

  revalidatePath("/ekonomi");
  revalidatePath("/om-foreningen");
  revalidatePath("/admin/foreningsinfo/ekonomi");

  return {
    savedKey: String(formData.get("snapshotKey") ?? ""),
    success:
      published > 0
        ? `Sparat. ${published} av ${FIGURES.length} nyckeltal visas nu på sidan Föreningens ekonomi.`
        : "Sparat. Inga nyckeltal visas på sidan Föreningens ekonomi, eftersom inget av dem går att räkna ut.",
  };
}
