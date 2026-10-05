"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FloorSpec } from "@/lib/numbering";
import { requireAdmin } from "@/lib/auth";
import {
  createApartmentsInBulk,
  createBuilding,
  deleteApartment,
  deleteBuilding,
  releaseApartment,
  reorderBuildings,
  setApartmentBuilding,
  setFloorPlan,
  updateApartmentFacts,
  updateBuilding,
} from "@/lib/data";
import {
  BUCKET_FLOORPLANS,
  BUCKET_PHOTOS,
  FLOORPLAN_TYPES,
  removeFile,
  uploadFile,
  validateFile,
} from "@/lib/storage";
import type { FormState } from "@/lib/form";

// Annonsåtgärderna bor under /admin/till-salu och importeras direkt därifrån –
// en "use server"-fil får inte återexportera actions från en annan.

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");
const aptId = (fd: FormData) => String(fd.get("apartmentId") ?? "");

function revalidate(id?: string) {
  revalidatePath("/admin/lagenheter");
  if (id) revalidatePath(`/admin/lagenheter/${id}`);
  revalidatePath("/till-salu");
  revalidatePath("/till-salu/[id]", "page");
  revalidatePath("/");
}

export async function updateFactsAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = aptId(fd);
  const result = await updateApartmentFacts(id, {
    number: str(fd, "number"),
    standardNumber: str(fd, "standardNumber"),
    floor: str(fd, "floor"),
    rooms: str(fd, "rooms"),
    sizeSqm: str(fd, "sizeSqm"),
    description: str(fd, "description"),
  });
  if (!result.ok) return { error: result.error };
  revalidate(id);
  return { success: "Lägenhetsfakta sparad." };
}

export async function uploadFloorPlanAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = aptId(fd);
  const file = fd.get("file") as File | null;
  const err = validateFile(file, FLOORPLAN_TYPES);
  if (err) return { error: err };
  const up = await uploadFile(BUCKET_FLOORPLANS, id, file!);
  if (!up.ok) return { error: up.error };
  const old = await setFloorPlan(id, up.path);
  if (old) await removeFile(BUCKET_FLOORPLANS, old);
  revalidate(id);
  return { success: "Planritning uppladdad." };
}

export async function removeFloorPlanAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  const old = await setFloorPlan(id, null);
  if (old) await removeFile(BUCKET_FLOORPLANS, old);
  revalidate(id);
}

export async function deleteApartmentAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  const { floorPlanPath, photoPaths } = await deleteApartment(id);
  if (floorPlanPath) await removeFile(BUCKET_FLOORPLANS, floorPlanPath);
  for (const p of photoPaths) await removeFile(BUCKET_PHOTOS, p);
  revalidatePath("/admin/lagenheter");
  revalidatePath("/admin/till-salu");
  revalidatePath("/till-salu");
  revalidatePath("/till-salu/[id]", "page");
  revalidatePath("/");
  redirect("/admin/lagenheter");
}

// ---------------------------------------------------------------------------
// Hus
// ---------------------------------------------------------------------------

const buildingSchema = z.object({
  name: z.string().min(1, "Ange ett namn på huset."),
  address: z.string().default(""),
  numberStart: z.string().default("1"),
  numberTopDown: z.boolean().default(false),
});

/** Läser husets fält ur formuläret. Kryssrutan saknas helt när den är av. */
function buildingFields(fd: FormData) {
  return {
    name: fd.get("name"),
    address: String(fd.get("address") ?? ""),
    numberStart: String(fd.get("numberStart") ?? "1"),
    numberTopDown: fd.get("numberTopDown") === "on",
  };
}

function revalidateBuildings(buildingId?: string) {
  revalidatePath("/admin/lagenheter");
  if (buildingId) revalidatePath(`/admin/lagenheter/hus/${buildingId}`);
  revalidatePath("/admin/lagenheter/hus/ej-placerade");
}

export async function createBuildingAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = buildingSchema.safeParse(buildingFields(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await createBuilding(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidateBuildings();
  return { success: `"${result.building.name}" lades till.` };
}

export async function updateBuildingAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = buildingSchema.safeParse(buildingFields(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await updateBuilding(id, parsed.data);
  if (!result.ok) return { error: result.error };
  revalidateBuildings(id);
  return { success: "Huset sparades." };
}

export async function deleteBuildingAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const result = await deleteBuilding(String(fd.get("id") ?? ""));
  if (!result.ok) return { error: result.error };

  // Databasen kaskaderar fotoraderna, men filerna i Storage måste bort separat.
  for (const path of result.floorPlanPaths) {
    await removeFile(BUCKET_FLOORPLANS, path);
  }
  for (const path of result.photoPaths) {
    await removeFile(BUCKET_PHOTOS, path);
  }

  revalidateBuildings();
  revalidatePath("/admin/till-salu");
  revalidatePath("/till-salu");
  revalidatePath("/till-salu/[id]", "page");
  revalidatePath("/");
  return {
    success:
      result.apartments > 0
        ? `Huset och ${result.apartments} ${result.apartments === 1 ? "lägenhet" : "lägenheter"} togs bort.`
        : "Huset togs bort.",
  };
}

/** Anropas direkt från klienten efter ett släpp – hela ordningen skickas. */
export async function reorderBuildingsAction(
  orderedIds: string[],
): Promise<FormState> {
  await requireAdmin();
  const result = await reorderBuildings(orderedIds);
  if (!result.ok) return { error: result.error };
  revalidateBuildings();
  return { success: "Ordningen sparad." };
}

export async function moveApartmentAction(
  apartmentId: string,
  buildingId: string,
): Promise<void> {
  await requireAdmin();
  await setApartmentBuilding(apartmentId, buildingId || null);
  revalidateBuildings(buildingId || undefined);
}

const bulkSchema = z.object({
  buildingId: z.string().min(1),
  // Negativa våningar = källarplan (entré = 0). Koden blir 10 + våning.
  floorFrom: z.coerce.number().int().min(-9).max(89),
  floorTo: z.coerce.number().int().min(-9).max(89),
  start: z
    .string()
    .regex(/^\d+$/, "Startnumret får bara innehålla siffror."),
});

export async function bulkAddApartmentsAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = bulkSchema.safeParse({
    buildingId: fd.get("buildingId"),
    floorFrom: fd.get("floorFrom"),
    floorTo: fd.get("floorTo"),
    start: String(fd.get("start") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera fälten." };
  }

  const { buildingId, floorFrom, floorTo, start } = parsed.data;
  const topDown = fd.get("topDown") === "on";
  if (floorTo < floorFrom) {
    return { error: "Ange ett giltigt våningsintervall." };
  }

  // Antalet kommer som ett fält per våning (count-1, count-2 …) eftersom
  // våningarna kan ha olika många lägenheter.
  const floors: FloorSpec[] = [];
  for (let f = floorFrom; f <= floorTo; f++) {
    const raw = Number(fd.get(`count-${f}`) ?? 0);
    if (!Number.isInteger(raw) || raw < 0 || raw > 99) {
      return { error: `Ogiltigt antal på våning ${f}.` };
    }
    floors.push({ floor: f, count: raw });
  }

  const result = await createApartmentsInBulk({ buildingId, start, topDown, floors });
  if (!result.ok) return { error: result.error };
  revalidateBuildings(buildingId);

  const { created, skipped } = result.result;
  if (created === 0) {
    return { error: "Inga nya lägenheter – alla nummer fanns redan." };
  }
  return {
    success:
      skipped.length > 0
        ? `${created} lägenheter skapades. ${skipped.length} hoppades över (fanns redan).`
        : `${created} lägenheter skapades.`,
  };
}

/**
 * Ägarbyte utan annons på sajten: bilder och annonstexter raderas och den
 * boende kopplas bort. Fakta och planritning ligger kvar till nästa ägare,
 * som kopplas när hen registrerar sig och öppnar Min lägenhet.
 */
export async function releaseApartmentAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  await releaseApartment(id);
  revalidatePath("/admin");
  revalidatePath("/admin/till-salu");
  revalidate(id);
}
