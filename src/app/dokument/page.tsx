import type { Metadata } from "next";
import Link from "next/link";
import { getPublicDocuments } from "@/lib/data";
import { Container, PageHeader, Section } from "@/components/ui";
import { GroupedDocumentList } from "@/components/document-list";
import { GuestOnly } from "@/components/guest-only";

export const metadata: Metadata = {
  title: "Dokument",
};

export default async function DocumentsPage() {
  const documents = await getPublicDocuments();

  return (
    <Section>
      <Container>
        <PageHeader
          title="Dokument"
          description="Föreningens offentliga dokument. Interna dokument som styrelseprotokoll finns på medlemssidorna."
        />

        <div className="mt-8">
          <GroupedDocumentList documents={documents} />
        </div>

        {/* Uppmaningen att logga in säger inget till den som redan är det.
            Sidan är statisk, så det avgörs i webbläsaren. */}
        <GuestOnly>
          <p className="mt-6 text-sm text-muted">
            Är du boende? Fler dokument finns när du är{" "}
            <Link href="/logga-in" className="text-brand-700 hover:underline">
              inloggad
            </Link>
            .
          </p>
        </GuestOnly>
      </Container>
    </Section>
  );
}
