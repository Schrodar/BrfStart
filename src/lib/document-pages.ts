import type { DocumentCategory, DocumentVisibility } from "@/lib/types";

/**
 * Publika sidor som visar ett urval av dokumenten, utöver /dokument som visar
 * alla publika. Sidornas filter och adminens ledtråd om var ett dokument syns
 * läser båda härifrån, så att de inte kan glida isär.
 *
 * Modulen saknar serverberoenden med flit – adminformuläret är en
 * klientkomponent.
 */
export const DOCUMENT_PAGES: Record<
  "stadgar" | "arsredovisningar",
  { label: string; categories: readonly DocumentCategory[] }
> = {
  stadgar: { label: "Stadgar", categories: ["stadgar", "ordningsregler"] },
  arsredovisningar: { label: "Årsredovisningar", categories: ["arsredovisning"] },
};

/**
 * Länken till kategorins egen sida, för rubriken på /dokument. Bara sidans
 * första kategori får länken – Ordningsregler (också på /stadgar) står direkt
 * under Stadgar.
 */
export function documentPageLink(
  category: DocumentCategory,
): { href: string; label: string } | null {
  for (const [slug, page] of Object.entries(DOCUMENT_PAGES)) {
    if (page.categories[0] === category) {
      return { href: `/${slug}`, label: `Till sidan ${page.label}` };
    }
  }
  return null;
}

/** Sidorna där ett dokument med given kategori och synlighet listas. */
export function documentPlacements(
  category: DocumentCategory,
  visibility: DocumentVisibility,
): string[] {
  // Styrelsens dokument syns bara i admin.
  if (visibility === "board") return ["Admin → Dokument"];
  // Medlemmarnas dokumentsida visar alla dokument, publika som interna.
  if (visibility === "member") return ["Mina sidor → Dokument"];
  const pages = Object.values(DOCUMENT_PAGES)
    .filter((page) => page.categories.includes(category))
    .map((page) => page.label);
  return ["Dokument", ...pages, "Mina sidor → Dokument"];
}
