import type { Metadata } from "next";
import Link from "next/link";
import { getPublicDocuments } from "@/lib/data";
import { DOCUMENT_PAGES } from "@/lib/document-pages";
import { Container, PageHeader, Section } from "@/components/ui";
import { DocumentList } from "@/components/document-list";

export const metadata: Metadata = {
  title: "Årsredovisningar",
  description: "Föreningens årsredovisningar samlade på ett ställe.",
};

/**
 * Årtalet en årsredovisning gäller, ur titeln: "Årsredovisning 2024" → 2024,
 * brutet räkenskapsår "2024/2025" → 2025. Null om titeln saknar årtal.
 */
function fiscalYearOf(title: string): number | null {
  const years = title.match(/(?<!\d)(?:19|20)\d{2}(?!\d)/g);
  return years ? Math.max(...years.map(Number)) : null;
}

/**
 * Sidan var tidigare en platshållare. Den visar nu dokumentkategorin
 * Årsredovisning, så att den fyller sig själv när styrelsen laddar upp.
 */
export default async function ArsredovisningarPage() {
  const documents = (await getPublicDocuments())
    .filter((d) =>
      DOCUMENT_PAGES.arsredovisningar.categories.includes(d.category),
    )
    .map((doc) => ({ doc, year: fiscalYearOf(doc.title) }))
    // Nyast räkenskapsår först – när en rapport laddades upp säger inget om
    // vilket år den gäller. Utan årtal i titeln hamnar dokumentet sist; lika
    // år behåller uppladdningsordningen (sort är stabil).
    .sort((a, b) => {
      if (a.year === b.year) return 0;
      if (a.year === null) return 1;
      if (b.year === null) return -1;
      return b.year - a.year;
    })
    .map(({ doc }) => doc);

  return (
    <Section>
      <Container>
        <PageHeader
          title="Årsredovisningar"
          description="Föreningens årsredovisningar samlade på ett ställe. Här ser mäklare och spekulanter föreningens ekonomi över tid."
        />

        <div className="mt-8">
          <DocumentList documents={documents} showCategory={false} />
        </div>

        <p className="mt-6 text-sm text-muted">
          Sammanfattning av ekonomin finns under{" "}
          <Link href="/ekonomi" className="text-brand-700 hover:underline">
            Föreningens ekonomi
          </Link>
          .
        </p>
      </Container>
    </Section>
  );
}
