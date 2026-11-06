"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  createMaintenanceCategory,
  deleteMaintenanceCategory,
  reorderMaintenanceCategories,
  updateMaintenanceCategory,
  updateMaintenanceRequest,
  updateMaintenanceSettings,
} from "@/lib/data";
import type { MaintenanceStatus } from "@/lib/types";
import type { FormState } from "@/lib/form";

const valid: MaintenanceStatus[] = ["ny", "pagar", "vantar", "atgardad"];

function revalidate() {
  revalidatePath("/admin/felanmalningar");
  revalidatePath("/admin/felanmalningar/mote");
  revalidatePath("/admin");
  revalidatePath("/felanmalan");
  revalidatePath("/kontakt");
  // Märket och statusarna på medlemmarnas egna sidor.
  revalidatePath("/medlem", "layout");
}

/**
 * Sparar ett ärende – från ärendemodalen och från mötesläget, som skickar
 * samma fält. Beslut, svar och notering blir var sin händelse i historiken.
 *
 * Sajten mejlar inte anmälaren. En inloggad anmälare ser status och svar på
 * Mina sidor; andra får styrelsens svar som ett mejl styrelsen skickar själv.
 */
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
    decision: String(fd.get("decision") ?? ""),
    decisionVisible: fd.get("decisionVisible") === "on",
    reply: String(fd.get("reply") ?? ""),
    note: String(fd.get("note") ?? ""),
    author: admin.fullName,
  });
  if (!updated) return { error: "Ärendet hittades inte." };
  revalidate();

  const parts = ["Ärendet sparat."];
  if (updated.messageToMember) {
    parts.push(
      updated.request.memberId
        ? "Anmälaren ser svaret på Mina sidor."
        : "Anmälaren var inte inloggad och ser inte svaret här – kopiera mejlet och skicka det.",
    );
  } else if (updated.statusChanged && updated.request.memberId) {
    parts.push("Anmälaren ser den nya statusen på Mina sidor.");
  }
  return { success: parts.join(" ") };
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
