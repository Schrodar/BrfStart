"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth";
import {
  addPhoto,
  getOrCreateOwnedApartment,
  removePhoto,
  setFloorPlan,
  updateApartmentFacts,
} from "@/lib/data";
import {
  BUCKET_FLOORPLANS,
  BUCKET_PHOTOS,
  FLOORPLAN_TYPES,
  IMAGE_TYPES,
  removeFile,
  uploadFile,
  validateFile,
} from "@/lib/storage";
import type { FormState } from "@/lib/form";
import { canEditListing, LOCKED_WHILE_PUBLISHED } from "@/lib/listing-rules";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

async function myApartment() {
  const user = await requireApprovedMember();
  const apartment = await getOrCreateOwnedApartment({
    id: user.id,
    apartment: user.apartment,
  });
  return { user, apartment };
}

function revalidate() {
  revalidatePath("/medlem/min-lagenhet");
  revalidatePath("/medlem/salja");
  revalidatePath("/admin/lagenheter");
  revalidatePath("/admin/till-salu");
  // Fakta, planritning och bilder syns i annonsen om lägenheten är publicerad.
  revalidatePath("/till-salu");
  revalidatePath("/till-salu/[id]", "page");
  revalidatePath("/");
}

const NO_APARTMENT = "Din lägenhet kunde inte kopplas. Kontakta styrelsen.";

export async function updateFactsAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { apartment } = await myApartment();
  if (!apartment) return { error: NO_APARTMENT };
  const result = await updateApartmentFacts(apartment.id, {
    number: str(fd, "number"),
    standardNumber: str(fd, "standardNumber"),
    floor: str(fd, "floor"),
    rooms: str(fd, "rooms"),
    sizeSqm: str(fd, "sizeSqm"),
    description: str(fd, "description"),
  });
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: "Lägenhetsfakta sparad." };
}

export async function uploadFloorPlanAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { apartment } = await myApartment();
  if (!apartment) return { error: NO_APARTMENT };
  const file = fd.get("file") as File | null;
  const err = validateFile(file, FLOORPLAN_TYPES);
  if (err) return { error: err };

  const up = await uploadFile(BUCKET_FLOORPLANS, apartment.id, file!);
  if (!up.ok) return { error: up.error };

  const old = await setFloorPlan(apartment.id, up.path);
  if (old) await removeFile(BUCKET_FLOORPLANS, old);
  revalidate();
  return { success: "Planritning uppladdad." };
}

export async function removeFloorPlanAction(): Promise<void> {
  const { apartment } = await myApartment();
  if (!apartment) return;
  const old = await setFloorPlan(apartment.id, null);
  if (old) await removeFile(BUCKET_FLOORPLANS, old);
  revalidate();
}

/**
 * Bilder inför en försäljning. Alla godkända boende får förbereda – det är
 * publiceringen som kräver styrelsens godkännande eller annonsrätt. Bilderna
 * visas publikt först när en annons publiceras.
 */
export async function uploadPhotoAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { user, apartment } = await myApartment();
  if (!apartment) return { error: NO_APARTMENT };
  if (!canEditListing(user.canManageListing, apartment)) {
    return { error: LOCKED_WHILE_PUBLISHED };
  }
  const file = fd.get("file") as File | null;
  const err = validateFile(file, IMAGE_TYPES);
  if (err) return { error: err };
  const up = await uploadFile(BUCKET_PHOTOS, apartment.id, file!);
  if (!up.ok) return { error: up.error };
  await addPhoto(apartment.id, up.path);
  revalidate();
  return { success: "Bilden är uppladdad." };
}

export async function removePhotoAction(fd: FormData): Promise<void> {
  const { user, apartment } = await myApartment();
  if (!apartment || !canEditListing(user.canManageListing, apartment)) return;
  // Lägenheten kommer från inloggningen – en annan lägenhets bild ger ingen träff.
  const path = await removePhoto(String(fd.get("photoId") ?? ""), apartment.id);
  if (path) await removeFile(BUCKET_PHOTOS, path);
  revalidate();
}
