"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createDocument, deleteDocument } from "@/lib/data";
import {
  BUCKET_DOCUMENTS,
  DOCUMENT_TYPES,
  removeFile,
  uploadFile,
  validateFile,
} from "@/lib/storage";
import { getCurrentAssociationId } from "@/lib/tenant";
import type { FormState } from "@/lib/form";

const schema = z.object({
  title: z.string().min(2, "Ange en titel."),
  category: z.enum(
    ["stadgar", "arsredovisning", "protokoll", "ordningsregler", "ovrigt"],
    { message: "Välj en kategori." },
  ),
  visibility: z.enum(["public", "member"]),
});

function revalidate() {
  revalidatePath("/admin/dokument");
  revalidatePath("/dokument");
  // Stadgar och årsredovisningar visar samma dokument, filtrerade per kategori
  // (se DOCUMENT_PAGES i src/lib/document-pages.ts).
  revalidatePath("/stadgar");
  revalidatePath("/arsredovisningar");
  revalidatePath("/medlem/dokument");
}

export async function createDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const file = formData.get("file") as File | null;
  const fileError = validateFile(file, DOCUMENT_TYPES);
  if (fileError) return { error: fileError };

  // Buckets delas mellan föreningar – prefixa med associationId så att
  // lagringen speglar databasens tenant-uppdelning.
  const associationId = await getCurrentAssociationId();
  const up = await uploadFile(
    BUCKET_DOCUMENTS,
    `${associationId}/${parsed.data.category}`,
    file!,
  );
  if (!up.ok) return { error: up.error };

  await createDocument({
    ...parsed.data,
    fileName: file!.name,
    storagePath: up.path,
    mimeType: file!.type,
    sizeBytes: file!.size,
  });
  revalidate();
  return { success: `Dokumentet "${parsed.data.title}" lades till.` };
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const path = await deleteDocument(id);
  if (path) await removeFile(BUCKET_DOCUMENTS, path);
  revalidate();
}
