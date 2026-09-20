"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  createMaintenanceCategory,
  deleteMaintenanceCategory,
  getMemberById,
  reorderMaintenanceCategories,
  updateMaintenanceCategory,
  updateMaintenanceRequest,
  updateMaintenanceSettings,
} from "@/lib/data";
import { notifyMaintenanceStatusChanged } from "@/lib/email";
import type { MaintenanceRequest, MaintenanceStatus } from "@/lib/types";
import type { FormState } from "@/lib/form";

const valid: MaintenanceStatus[] = ["ny", "pagar", "atgardad"];

function revalidate() {
  revalidatePath("/admin/felanmalningar");
  revalidatePath("/admin");
  revalidatePath("/felanmalan");
  revalidatePath("/kontakt");
  // Märket och statusarna på medlemmarnas egna sidor.
  revalidatePath("/medlem", "layout");
}

/**
 * Berättar för medlemmen att statusen ändrats. Mejlet går till den e-post
 * medlemmen angav i anmälan, annars till kontots. Ett misslyckat utskick får
 * inte stoppa sparningen – statusen syns ändå på Mina sidor.
 *
 * Returnerar om någon aviserades, så att styrelsen får veta det.
 */
async function notifyReporter(request: MaintenanceRequest): Promise<boolean> {
  if (!request.memberId) return false;
  const member = await getMemberById(request.memberId);
  if (!member) return false;
  try {
    await notifyMaintenanceStatusChanged({
      to: request.email || member.email,
      name: member.fullName,
      category: request.categoryName,
      location: request.location,
      status: request.status,
    });
    return true;
  } catch (error) {
    console.error("Kunde inte avisera medlemmen om ny status:", error);
    return false;
  }
}

/** Sparar status, tilldelning och notering från ärendemodalen. */
export async function updateRequestAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const raw = String(fd.get("status") ?? "");
  const status = (valid.includes(raw as MaintenanceStatus)
    ? raw
    : "ny") as MaintenanceStatus;

  const updated = await updateMaintenanceRequest(id, {
    status,
    assignedTo: String(fd.get("assignedTo") ?? ""),
    note: String(fd.get("note") ?? ""),
    author: admin.fullName,
  });
  if (!updated) return { error: "Ärendet hittades inte." };

  const notified =
    updated.statusChanged && (await notifyReporter(updated.request));
  revalidate();
  return {
    success: notified
      ? "Ärendet sparat. Medlemmen har fått besked om den nya statusen."
      : "Ärendet sparat.",
  };
}

// ---------------------------------------------------------------------------
// Inställningar
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  introText: z.string().default(""),
  emergencyPhone: z.string().default(""),
  emergencyText: z.string().default(""),
  caretakerName: z.string().default(""),
  caretakerPhone: z.string().default(""),
  caretakerText: z.string().default(""),
});

export async function updateSettingsAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    introText: String(fd.get("introText") ?? ""),
    emergencyPhone: String(fd.get("emergencyPhone") ?? ""),
    emergencyText: String(fd.get("emergencyText") ?? ""),
    caretakerName: String(fd.get("caretakerName") ?? ""),
    caretakerPhone: String(fd.get("caretakerPhone") ?? ""),
    caretakerText: String(fd.get("caretakerText") ?? ""),
  });
  if (!parsed.success) return { error: "Kontrollera fälten." };

  await updateMaintenanceSettings(parsed.data);
  revalidate();
  return { success: "Sparat." };
}

// ---------------------------------------------------------------------------
// Kategorier
// ---------------------------------------------------------------------------

export async function createCategoryAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const result = await createMaintenanceCategory(String(fd.get("name") ?? ""));
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: `"${result.category.name}" lades till.` };
}

/**
 * Namn och underleverantör sparas i samma formulär. Saknas kontaktfälten helt
 * (namnbytesformuläret i listan) lämnas underleverantören orörd.
 */
export async function updateCategoryAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const hasContractor = fd.has("contractorName");
  const result = await updateMaintenanceCategory(
    String(fd.get("id") ?? ""),
    String(fd.get("name") ?? ""),
    hasContractor
      ? {
          contractorName: String(fd.get("contractorName") ?? ""),
          contractorPhone: String(fd.get("contractorPhone") ?? ""),
          contractorEmail: String(fd.get("contractorEmail") ?? ""),
          contractorInfo: String(fd.get("contractorInfo") ?? ""),
        }
      : undefined,
  );
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: "Kategorin sparades." };
}

export async function deleteCategoryAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  const result = await deleteMaintenanceCategory(String(fd.get("id") ?? ""));
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: "Kategorin togs bort." };
}

/** Anropas direkt från klienten efter ett släpp – hela ordningen skickas. */
export async function reorderCategoriesAction(
  orderedIds: string[],
): Promise<FormState> {
  await requireAdmin();
  const result = await reorderMaintenanceCategories(orderedIds);
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: "Ordningen sparad." };
}
