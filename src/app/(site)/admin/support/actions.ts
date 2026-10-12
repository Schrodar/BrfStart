"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { endSupportSession, SUPPORT_COOKIE } from "@/lib/data/support";

/**
 * Avslutar supportläget. Sessionen stängs i databasen först och cookien rensas
 * sedan – ordningen spelar roll, eftersom en kvarlämnad session annars skulle
 * gälla tills tiden gick ut.
 */
export async function endSupportAction(): Promise<void> {
  const jar = await cookies();
  const value = jar.get(SUPPORT_COOKIE)?.value;
  if (value) await endSupportSession(value);
  jar.delete(SUPPORT_COOKIE);
  redirect("/");
}
