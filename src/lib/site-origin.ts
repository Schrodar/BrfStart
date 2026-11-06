import { headers } from "next/headers";

/**
 * Sajtens adress, byggd av förfrågan. Samma kod körs på flera domäner (en
 * deploy per förening), så adressen kan inte stå i koden. Används för länkar
 * som lämnar sajten: inbjudningar, trapphustavlor och breven med koder.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
