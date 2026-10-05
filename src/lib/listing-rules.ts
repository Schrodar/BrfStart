import type { Apartment } from "@/lib/types";

/**
 * Vem som får göra vad med en boendes egen annons.
 *
 * Alla godkända boende får förbereda: fakta, planritning, bilder och
 * annonstexter. Att PUBLICERA kräver annonsrätt – annars skickar den boende
 * annonsen till styrelsen, som publicerar.
 *
 * När styrelsen har publicerat får en boende utan annonsrätt inte ändra texter
 * eller bilder, eftersom ändringen då skulle bli publik utan granskning. Hen
 * avpublicerar, ändrar och skickar till styrelsen igen.
 */
export function canEditListing(
  canManageListing: boolean,
  apartment: Pick<Apartment, "listingStatus">,
): boolean {
  return canManageListing || apartment.listingStatus !== "published";
}

export const LOCKED_WHILE_PUBLISHED =
  "Annonsen är publicerad. Avpublicera den för att ändra, och skicka den sedan till styrelsen igen.";
