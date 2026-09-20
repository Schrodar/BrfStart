import { getAllDocuments } from "@/lib/data";
import {
  categoryLabel,
  DOCUMENT_CATEGORIES,
} from "@/lib/data/documents";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { DocumentForm } from "./document-form";
import { DeleteDocumentButton } from "./delete-document-button";

export default async function AdminDocumentsPage() {
  const documents = await getAllDocuments();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dokument"
        description="Lägg till och ta bort föreningens dokument."
      />

      <Card>
        <CardBody>
          <h2 className="mb-4 font-semibold">Lägg till dokument</h2>
          <DocumentForm categories={[...DOCUMENT_CATEGORIES]} />
        </CardBody>
      </Card>

      {documents.length === 0 ? (
        <EmptyState title="Inga dokument ännu" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Synlighet</th>
                <th className="px-4 py-3 font-medium">Tillagt</th>
                <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{doc.title}</p>
                    <p className="text-xs text-muted">{doc.fileName}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {categoryLabel(doc.category)}
                  </td>
                  <td className="px-4 py-3">
                    {doc.visibility === "member" ? (
                      <Badge tone="brand">Medlemmar</Badge>
                    ) : (
                      <Badge tone="success">Publik</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteDocumentButton id={doc.id} title={doc.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
