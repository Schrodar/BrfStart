"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedMember } from "@/lib/auth";
import {
  endListing,
  getOrCreateOwnedApartment,
  publishListing,
  startListing,
  submitListing,
  unpublishListing,
  updateListing,
  withdrawListing,
} from "@/lib/data";
import type { FormState } from "@/lib/form";
import { canEditListing, LOCKED_WHILE_PUBLISHED } from "@/lib/listing-rules";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

const NO_APARTMENT = "Din lägenhet kunde inte kopplas. Kontakta styrelsen.";

/**
 * Den boende hanterar bara sin EGEN lägenhet – id:t kommer aldrig från
 * formuläret utan slås upp från inloggningen. Därför kan ingen ändra en
 * annan lägenhets annons genom att skicka ett annat id.
 *
 * Alla godkända boende får förbereda och ta ner sin annons. Publicera kräver
 * annonsrätt; utan den skickas annonsen till styrelsen (src/lib/listing-rules.ts).
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
  revalidatePath("/admin");
  revalidatePath("/till-salu");
  revalidatePath("/till-salu/[id]", "page");
  revalidatePath("/");
}

export async function startListingAction(): Promise<void> {
  const { apartment } = await mine();
  if (!apartment) return;
  await startListing(apartment.id);
  revalidate();
}

export async function updateListingAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { user, apartment } = await mine();
  if (!apartment) return { error: NO_APARTMENT };
  if (!canEditListing(user.canManageListing, apartment)) {
    return { error: LOCKED_WHILE_PUBLISHED };
  }
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

/** Bara med annonsrätt – annars är det styrelsen som publicerar. */
export async function publishAction(): Promise<void> {
  const { user, apartment } = await mine();
  if (!apartment || !user.canManageListing) return;
  await publishListing(apartment.id);
  revalidate();
}

/** Skickar utkastet till styrelsen, som publicerar under Admin → Till salu. */
export async function submitListingAction(): Promise<void> {
  const { apartment } = await mine();
  if (!apartment) return;
  await submitListing(apartment.id);
  revalidate();
}

/** Tar tillbaka ett utkast som skickats till styrelsen. */
export async function withdrawListingAction(): Promise<void> {
  const { apartment } = await mine();
  if (!apartment) return;
  await withdrawListing(apartment.id);
  revalidate();
}

/** Att ta ner sin egen annons får alla – den finns kvar som utkast. */
export async function unpublishAction(): Promise<void> {
  const { apartment } = await mine();
  if (!apartment) return;
  await unpublishListing(apartment.id);
  revalidate();
}

export async function endListingAction(): Promise<void> {
  const { apartment } = await mine();
  if (!apartment) return;
  await endListing(apartment.id);
  revalidate();
}
