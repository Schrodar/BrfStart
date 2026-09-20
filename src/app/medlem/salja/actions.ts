"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth";
import {
  addPhoto,
  endListing,
  getOrCreateOwnedApartment,
  publishListing,
  removePhoto,
  startListing,
  unpublishListing,
  updateListing,
} from "@/lib/data";
import {
  BUCKET_PHOTOS,
  IMAGE_TYPES,
  removeFile,
  uploadFile,
  validateFile,
} from "@/lib/storage";
import type { FormState } from "@/lib/form";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

const NO_APARTMENT = "Din lägenhet kunde inte kopplas. Kontakta styrelsen.";
const NO_PERMISSION = "Du saknar behörighet att hantera annons.";

/**
 * Den boende hanterar bara sin EGEN lägenhet – id:t kommer aldrig från
 * formuläret utan slås upp från inloggningen. Därför kan ingen ändra en
 * annan lägenhets annons genom att skicka ett annat id.
 */
async function mine() {
  const user = await requireApprovedMember();
  const apartment = await getOrCreateOwnedApartment({
    id: user.id,
    apartment: user.apartment,
  });
  return { user, apartment };
}

function revalidate() {
  revalidatePath("/medlem/salja");
  revalidatePath("/medlem/min-lagenhet");
  revalidatePath("/admin/till-salu");
  revalidatePath("/till-salu");
  revalidatePath("/till-salu/[id]", "page");
  revalidatePath("/");
}

export async function startListingAction(): Promise<void> {
  const { user, apartment } = await mine();
  if (!apartment || !user.canManageListing) return;
  await startListing(apartment.id);
  revalidate();
}

export async function updateListingAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { user, apartment } = await mine();
  if (!apartment) return { error: NO_APARTMENT };
  if (!user.canManageListing) return { error: NO_PERMISSION };
  await updateListing(apartment.id, {
    price: str(fd, "price"),
    monthlyFee: str(fd, "monthlyFee"),
    viewingInfo: str(fd, "viewingInfo"),
    saleDescription: str(fd, "saleDescription"),
    brokerName: str(fd, "brokerName"),
    brokerPhone: str(fd, "brokerPhone"),
    brokerEmail: str(fd, "brokerEmail"),
    hemnetUrl: str(fd, "hemnetUrl"),
    showFloorPlanPublicly: fd.get("showFloorPlanPublicly") === "on",
  });
  revalidate();
  return { success: "Annonsen sparad." };
}

export async function publishAction(): Promise<void> {
  const { user, apartment } = await mine();
  if (!apartment || !user.canManageListing) return;
  await publishListing(apartment.id);
  revalidate();
}

export async function unpublishAction(): Promise<void> {
  const { user, apartment } = await mine();
  if (!apartment || !user.canManageListing) return;
  await unpublishListing(apartment.id);
  revalidate();
}

export async function endListingAction(): Promise<void> {
  const { user, apartment } = await mine();
  if (!apartment || !user.canManageListing) return;
  await endListing(apartment.id);
  revalidate();
}

export async function uploadPhotoAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { user, apartment } = await mine();
  if (!apartment) return { error: NO_APARTMENT };
  if (!user.canManageListing) return { error: NO_PERMISSION };
  const file = fd.get("file") as File | null;
  const err = validateFile(file, IMAGE_TYPES);
  if (err) return { error: err };
  const up = await uploadFile(BUCKET_PHOTOS, apartment.id, file!);
  if (!up.ok) return { error: up.error };
  await addPhoto(apartment.id, up.path);
  revalidate();
  return { success: "Foto uppladdat." };
}

export async function removePhotoAction(fd: FormData): Promise<void> {
  const { user, apartment } = await mine();
  if (!apartment || !user.canManageListing) return;
  const path = await removePhoto(String(fd.get("photoId") ?? ""), apartment.id);
  if (path) await removeFile(BUCKET_PHOTOS, path);
  revalidate();
}
