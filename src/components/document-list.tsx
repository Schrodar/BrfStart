import type { DocumentItem } from "@/lib/types";
import { categoryLabel, DOCUMENT_CATEGORIES } from "@/lib/data/documents";
import { formatDate } from "@/lib/utils";
import { Badge, EmptyState } from "@/components/ui";

function DownloadIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-brand-600"
    >
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DocumentList({
  documents,
  showVisibility = false,
  showCategory = true,
}: {
  documents: DocumentItem[];
  showVisibility?: boolean;
  /** Av när listan redan står under en kategorirubrik. */
  showCategory?: boolean;
}) {
  if (documents.length === 0) {
    return <EmptyState title="Inga dokument ännu" />;
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
      {documents.map((doc) => {
        const meta = [
          showCategory ? categoryLabel(doc.category) : null,
          doc.fileName,
          doc.sizeLabel,
          formatDate(doc.uploadedAt),
        ]
          .filter(Boolean)
          .join(" · ");
        const body = (
          <>
            <DownloadIcon />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{doc.title}</p>
              <p className="text-xs text-muted">{meta}</p>
            </div>
            {showVisibility && doc.visibility === "member" ? (
              <Badge tone="brand">Endast medlemmar</Badge>
            ) : null}
          </>
        );

        return (
          <li key={doc.id}>
            {doc.hasFile ? (
              <a
                href={doc.fileUrl}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-brand-50/60"
                target="_blank"
                rel="noopener"
              >
                {body}
              </a>
            ) : (
              // Ingen uppladdad fil (demorad) – visa posten men inte som länk.
              <div className="flex items-center gap-4 px-4 py-3.5 opacity-60">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Dokumenten under en rubrik per kategori, i DOCUMENT_CATEGORIES ordning.
 * Kategorier utan dokument hoppas över.
 */
export function GroupedDocumentList({
  documents,
}: {
  documents: DocumentItem[];
}) {
  if (documents.length === 0) {
    return <EmptyState title="Inga dokument ännu" />;
  }

  return (
    <div className="space-y-10">
      {DOCUMENT_CATEGORIES.map((category) => {
        const inCategory = documents.filter((d) => d.category === category.value);
        if (inCategory.length === 0) return null;
        const headingId = `dokument-${category.value}`;
        return (
          <section key={category.value} aria-labelledby={headingId}>
            <h2 id={headingId} className="text-xl font-bold tracking-tight">
              {category.heading}
            </h2>
            <div className="mt-4">
              <DocumentList documents={inCategory} showCategory={false} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
