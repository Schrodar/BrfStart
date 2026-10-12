import type { Metadata } from "next";
import Link from "next/link";
import { getPublicDocuments } from "@/lib/data";
import { DOCUMENT_PAGES } from "@/lib/document-pages";
import { Container, PageIntro, Section } from "@/components/ui";
import { GroupedDocumentList } from "@/components/document-list";

export const metadata: Metadata = {
  title: "Stadgar",
  description: "Föreningens stadgar och ordningsregler.",
};

/**
 * Sidan var tidigare ett tomt skal som hänvisade tillbaka till /dokument.
 * Nu visar den samma dokument som dokumentsidan, filtrerade på de kategorier
 * som hör hit – en riktig ingång i stället för en omväg.
 */
export default async function StadgarPage() {
  const documents = (await getPublicDocuments()).filter((d) =>
    DOCUMENT_PAGES.stadgar.categories.includes(d.category),
  );

  return (
    <Section>
      <Container>
        <PageIntro
          eyebrow="Om föreningen"
          title="Stadgar och ordningsregler"
          description="Reglerna som gäller i föreningen – vad stadgarna säger och vad som gäller i vardagen."
        />

        <div className="mt-12">
          <GroupedDocumentList documents={documents} />
        </div>

        <p className="mt-6 text-sm text-muted">
          Föreningens övriga dokument finns under{" "}
          <Link href="/dokument" className="link-inline">
            Dokument
          </Link>
          .
        </p>
      </Container>
    </Section>
  );
}
