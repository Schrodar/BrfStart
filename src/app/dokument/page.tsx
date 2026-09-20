import type { Metadata } from "next";
import Link from "next/link";
import { getPublicDocuments } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { Container, PageHeader, Section } from "@/components/ui";
import { GroupedDocumentList } from "@/components/document-list";

export const metadata: Metadata = {
  title: "Dokument",
};

export default async function DocumentsPage() {
  // getCurrentUser() är request-cachad, så det här är inget extra anrop utöver
  // det layouten redan gör.
  const [documents, user] = await Promise.all([
    getPublicDocuments(),
    getCurrentUser(),
  ]);

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

        {/* Uppmaningen att logga in säger inget till den som redan är det. */}
        {user ? null : (
          <p className="mt-6 text-sm text-muted">
            Är du boende? Fler dokument finns när du är{" "}
            <Link href="/logga-in" className="text-brand-700 hover:underline">
              inloggad
            </Link>
            .
          </p>
        )}
      </Container>
    </Section>
  );
}
