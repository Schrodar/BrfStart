"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  addPhoto,
  endListing,
  publishListing,
  releaseApartment,
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
const aptId = (fd: FormData) => String(fd.get("apartmentId") ?? "");

function revalidate(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/till-salu");
  revalidatePath("/admin/lagenheter");
  revalidatePath("/medlem/min-lagenhet");
  revalidatePath("/medlem/salja");
  if (id) {
    revalidatePath(`/admin/till-salu/${id}`);
    revalidatePath(`/admin/lagenheter/${id}`);
  }
  revalidatePath("/till-salu");
  revalidatePath("/till-salu/[id]", "page");
  revalidatePath("/");
}

/** Påbörjar en annons och går direkt vidare till den. */
export async function startListingAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  await startListing(id);
  revalidate(id);
  redirect(`/admin/till-salu/${id}`);
}

export async function updateListingAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = aptId(fd);
  await updateListing(id, {
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
  revalidate(id);
  return { success: "Annonsen sparad." };
}

export async function publishAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  await publishListing(id);
  revalidate(id);
}

export async function unpublishAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  await unpublishListing(id);
  revalidate(id);
}

/** Avslutar försäljningen. Lägenheten och dess foton finns kvar i registret. */
export async function endListingAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  await endListing(id);
  revalidate(id);
  redirect("/admin/till-salu");
}

export async function uploadPhotoAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = aptId(fd);
  const file = fd.get("file") as File | null;
  const err = validateFile(file, IMAGE_TYPES);
  if (err) return { error: err };
  const up = await uploadFile(BUCKET_PHOTOS, id, file!);
  if (!up.ok) return { error: up.error };
  await addPhoto(id, up.path);
  revalidate(id);
  return { success: "Foto uppladdat." };
}

export async function removePhotoAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  const path = await removePhoto(String(fd.get("photoId") ?? ""));
  if (path) await removeFile(BUCKET_PHOTOS, path);
  revalidate(id);
}

/**
 * Försäljningen är klar: annonsen, annonstexterna och bilderna raderas och
 * säljaren kopplas bort från lägenheten. Fakta och planritning ligger kvar
 * till nästa ägare.
 */
export async function completeSaleAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = aptId(fd);
  await releaseApartment(id);
  revalidate(id);
  redirect("/admin/till-salu");
}
