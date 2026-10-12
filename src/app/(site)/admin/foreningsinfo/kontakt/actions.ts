"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { updateAssociationProfile } from "@/lib/data";
import type { FormState } from "@/lib/form";

const optionalEmail = z.union([
  z.string().email("Ange en giltig e-postadress."),
  z.literal(""),
]);

const schema = z.object({
  name: z.string().min(2, "Ange föreningens namn."),
  shortName: z.string(),
  organizationNumber: z.union([
    z.string().regex(/^\d{6}-\d{4}$/, "Organisationsnumret skrivs som 769600-0000."),
    z.literal(""),
  ]),
  street: z.string(),
  postalCode: z.string(),
  city: z.string(),
  contactEmail: optionalEmail,
  contactPhone: z.string(),
  propertyManagerName: z.string(),
  propertyManagerPhone: z.string(),
  propertyManagerEmail: optionalEmail,
});

export async function updateAssociationProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const raw = Object.fromEntries(
    Object.keys(schema.shape).map((key) => [
      key,
      String(formData.get(key) ?? "").trim(),
    ]),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await updateAssociationProfile(parsed.data);
  // Namnet och kontaktuppgifterna syns i header och footer på alla sidor.
  revalidatePath("/", "layout");

  return { success: "Namn och kontaktuppgifter har sparats." };
}
