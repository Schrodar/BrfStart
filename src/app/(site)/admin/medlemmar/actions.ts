"use server";

import { revalidatePath } from "next/cache";
import { requireSupport } from "@/lib/auth";
import { grantApartmentAdmin, revokeAdmin } from "@/lib/data";

/*
 * Konton – bara plattformsägaren (JnM) i ett supportläge, så varje skrivning
 * hamnar i supportloggen. En ledamot använder sin lägenhets konto, som får
 * admin-rätt här. Koderna skapas med newCodeAction under Hus och lägenheter.
 */

function revalidate() {
  revalidatePath("/admin/medlemmar");
  revalidatePath("/admin/lagenheter", "layout");
  revalidatePath("/admin");
}

/** Lägenhetens konto får admin-rätt – någon i lägenheten sitter i styrelsen. */
export async function grantAdminAction(formData: FormData): Promise<void> {
  await requireSupport();
  await grantApartmentAdmin(String(formData.get("apartmentId") ?? ""));
  revalidate();
}

/**
 * Lägenhetens konto blir ett vanligt lägenhetskonto igen. Ett personligt
 * admin-konto tas bort ur föreningen.
 */
export async function revokeAdminAction(formData: FormData): Promise<void> {
  await requireSupport();
  await revokeAdmin(String(formData.get("memberId") ?? ""));
  revalidate();
}
