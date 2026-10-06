import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Fillagring i Supabase Storage.
 * - apartment-photos: PUBLIK bucket (annonsfoton) → stabila publika URL:er.
 * - floor-plans:      PRIVAT bucket (planritningar) → server-genererade signed URLs.
 * - documents:        PRIVAT bucket (föreningsdokument) → signed URLs via
 *                     /dokument/[id]/ladda-ner, som kontrollerar synligheten.
 * - news-images:      PUBLIK bucket (nyhetsbilder) → stabila publika URL:er.
 *
 * Buckets delas av alla föreningar som kör mot samma Supabase-projekt, så
 * anroparen ansvarar för att prefixa med associationId (se uploadFile).
 *
 * Alla operationer går via service role-klienten (server only). Behörighet
 * kontrolleras i respektive server action innan dessa anropas.
 */

export const BUCKET_PHOTOS = "apartment-photos";
export const BUCKET_FLOORPLANS = "floor-plans";
export const BUCKET_DOCUMENTS = "documents";
export const BUCKET_NEWS = "news-images";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const FLOORPLAN_TYPES = [...IMAGE_TYPES, "application/pdf"];
export const DOCUMENT_TYPES = ["application/pdf", ...IMAGE_TYPES];
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB – se bodySizeLimit i next.config.ts

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Returnerar felmeddelande om filen inte duger, annars null. */
export function validateFile(
  file: File | null,
  allowed: string[],
): string | null {
  if (!file || file.size === 0) return "Ingen fil vald.";
  if (file.size > MAX_FILE_BYTES) return "Filen är för stor (max 5 MB).";
  if (!allowed.includes(file.type)) return "Filtypen stöds inte.";
  return null;
}

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/** Laddar upp en fil och returnerar dess lagringsväg (path i bucketen). */
export async function uploadFile(
  bucket: string,
  prefix: string,
  file: File,
): Promise<UploadResult> {
  const supabase = createSupabaseAdminClient();
  const path = `${prefix}/${crypto.randomUUID()}.${EXT[file.type] ?? "bin"}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) return { ok: false, error: "Uppladdningen misslyckades." };
  return { ok: true, path };
}

export async function removeFile(bucket: string, path: string): Promise<void> {
  if (!path) return;
  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(bucket).remove([path]);
}

/** Stabil publik URL (för foton i publik bucket). */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createSupabaseAdminClient();
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Kortlivad signerad URL (för privata planritningar). Null vid fel. */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  return error || !data ? null : data.signedUrl;
}
