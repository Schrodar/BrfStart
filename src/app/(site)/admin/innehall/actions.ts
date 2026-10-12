"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { updateSiteContent } from "@/lib/data";
import type { FormState } from "@/lib/form";

const schema = z.object({
  heroTitle: z.string().min(2, "Ange en rubrik för startsidan."),
  heroSubtitle: z.string().min(2, "Ange en underrubrik."),
  welcomeBody: z.string().min(2, "Ange en välkomsttext."),
  aboutBody: z.string().min(2, "Ange en text för Om föreningen."),
});

export async function updateSiteContentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    heroTitle: formData.get("heroTitle"),
    heroSubtitle: formData.get("heroSubtitle"),
    welcomeBody: formData.get("welcomeBody"),
    aboutBody: formData.get("aboutBody"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  await updateSiteContent(parsed.data);
  revalidatePath("/");
  revalidatePath("/om-foreningen");
  revalidatePath("/admin/innehall");

  return { success: "Sidinnehållet har sparats." };
}
