"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { grantApartmentAdmin, revokeAdmin } from "@/lib/data";

/*
 * Konton – styrelsens admins och JnM i ett supportläge. En ledamot använder
 * sin lägenhets konto, som får admin-rätt här. I supportläget hamnar
 * skrivningarna i supportloggen. Koderna skapas bara av JnM, med newCodeAction
 * under Hus och lägenheter.
 */

function revalidate() {
  revalidatePath("/admin/medlemmar");
  revalidatePath("/admin/lagenheter", "layout");
  revalidatePath("/admin");
}

/** Lägenhetens konto får admin-rätt – någon i lägenheten sitter i styrelsen. */
export async function grantAdminAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await grantApartmentAdmin(String(formData.get("apartmentId") ?? ""));
  revalidate();
}

/**
 * Lägenhetens konto blir ett vanligt lägenhetskonto igen. Ett personligt
 * admin-konto tas bort ur föreningen.
 *
 * Ingen tar bort sin egen admin-rätt – annars kunde styrelsen av misstag bli
 * utan admins. Det gör en annan admin, eller JnM.
 */
export async function revokeAdminAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  if (memberId === user.id) return;
  await revokeAdmin(memberId);
  revalidate();
}
