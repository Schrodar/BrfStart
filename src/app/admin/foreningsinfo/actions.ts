"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateAssociationInfo } from "@/lib/data";
import type { FormState } from "@/lib/form";

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function str(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

export async function updateAssociationInfoAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  await updateAssociationInfo({
    builtYear: Number(formData.get("builtYear")) || 0,
    apartments: Number(formData.get("apartments")) || 0,
    associationType: str(formData.get("associationType")),
    landOwnership: str(formData.get("landOwnership")),
    heating: str(formData.get("heating")),
    broadband: str(formData.get("broadband")),
    parking: str(formData.get("parking")),
    laundry: str(formData.get("laundry")),
    commonAreas: str(formData.get("commonAreas")),
    energyClass: str(formData.get("energyClass")),
    pets: str(formData.get("pets")),
    feesInfo: str(formData.get("feesInfo")),
    economySummary: str(formData.get("economySummary")),
    renovationsDone: lines(formData.get("renovationsDone")),
    renovationsPlanned: lines(formData.get("renovationsPlanned")),
  });

  // Fälten visas på fyra publika sidor – alla fyra måste uppdateras.
  revalidatePath("/admin/foreningsinfo");
  revalidatePath("/om-foreningen");
  revalidatePath("/fastigheten");
  revalidatePath("/for-maklare");
  revalidatePath("/ekonomi");

  return { success: "Föreningsinformationen har sparats." };
}
