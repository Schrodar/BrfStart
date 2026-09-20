"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { markMemberMaintenanceSeen } from "@/lib/data";

/**
 * Körs när medlemmen öppnat sina felanmälningar: nuvarande statusar räknas
 * som sedda och märket i menyn slutar pulsera. Utloggad användare gör inget –
 * anropet sker i bakgrunden, så en omdirigering vore fel.
 */
export async function markMaintenanceSeenAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await markMemberMaintenanceSeen(user.id);
  revalidatePath("/medlem", "layout");
}
