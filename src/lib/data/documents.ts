import type { Document as DbDocument } from "@prisma/client";
import type {
  DocumentCategory,
  DocumentItem,
  DocumentVisibility,
} from "@/lib/types";
import { getTenantDb } from "@/lib/tenant";
import { formatBytes } from "@/lib/utils";

/**
 * Ordningen styr både adminens rullgardin och rubrikordningen på /dokument.
 * heading är rubriken när dokumenten grupperas per kategori.
 */
export const DOCUMENT_CATEGORIES: {
  value: DocumentCategory;
  label: string;
  heading: string;
}[] = [
  { value: "stadgar", label: "Stadgar", heading: "Stadgar" },
  { value: "ordningsregler", label: "Ordningsregler", heading: "Ordningsregler" },
  { value: "arsredovisning", label: "Årsredovisning", heading: "Årsredovisningar" },
  { value: "protokoll", label: "Protokoll", heading: "Protokoll" },
  { value: "ovrigt", label: "Övrigt", heading: "Övrigt" },
];

export function categoryLabel(cat: DocumentCategory): string {
  return DOCUMENT_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

function toDocument(d: DbDocument): DocumentItem {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    visibility: d.visibility,
    fileName: d.fileName,
    // Aldrig storagePath eller en signerad URL – alltid routen som kontrollerar
    // behörigheten på nytt vid varje klick.
    fileUrl: `/dokument/${d.id}/ladda-ner`,
    hasFile: d.storagePath !== "",
    sizeBytes: d.sizeBytes,
    sizeLabel: formatBytes(d.sizeBytes),
    uploadedAt: d.uploadedAt.toISOString(),
  };
}

/** Endast publika dokument (för publik dokumentsida). */
export async function getPublicDocuments(): Promise<DocumentItem[]> {
  const { db } = await getTenantDb();
  const rows = await db.document.findMany({
    where: { visibility: "public" },
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map(toDocument);
}

/** Alla dokument – medlemmar ser både publika och interna. */
export async function getMemberDocuments(): Promise<DocumentItem[]> {
  const { db } = await getTenantDb();
  const rows = await db.document.findMany({ orderBy: { uploadedAt: "desc" } });
  return rows.map(toDocument);
}

/** Alla dokument (admin). */
export async function getAllDocuments(): Promise<DocumentItem[]> {
  const { db } = await getTenantDb();
  const rows = await db.document.findMany({ orderBy: { uploadedAt: "desc" } });
  return rows.map(toDocument);
}

/**
 * Dokumentet som nedladdningsrouten behöver: synlighet för behörighetskontroll
 * och storagePath för att signera. Uppslaget är tenant-scopat, så ett id från
 * en annan förening ger null.
 */
export async function getDocumentForDownload(
  id: string,
): Promise<{ visibility: DocumentVisibility; storagePath: string } | null> {
  const { db } = await getTenantDb();
  const row = await db.document.findFirst({
    where: { id },
    select: { visibility: true, storagePath: true },
  });
  return row;
}

export interface DocumentInput {
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export async function createDocument(input: DocumentInput): Promise<DocumentItem> {
  const { db, associationId } = await getTenantDb();
  const row = await db.document.create({ data: { associationId, ...input } });
  return toDocument(row);
}

/** Tar bort dokumentet och returnerar dess storagePath så att filen kan städas. */
export async function deleteDocument(id: string): Promise<string | null> {
  const { db } = await getTenantDb();
  const row = await db.document.findFirst({
    where: { id },
    select: { storagePath: true },
  });
  if (!row) return null;
  await db.document.deleteMany({ where: { id } });
  return row.storagePath;
}
