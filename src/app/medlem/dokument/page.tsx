import { requireApprovedMember } from "@/lib/auth";
import { getMemberDocuments } from "@/lib/data";
import { DocumentList } from "@/components/document-list";

export default async function MemberDocumentsPage() {
  await requireApprovedMember();
  const documents = await getMemberDocuments();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Dokument</h2>
        <p className="text-sm text-muted">
          Här ser du både föreningens offentliga dokument och interna dokument
          som endast är tillgängliga för boende.
        </p>
      </div>
      <DocumentList documents={documents} showVisibility />
    </div>
  );
}
