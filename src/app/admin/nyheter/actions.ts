"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createNews, deleteNews, setNewsImage, updateNews } from "@/lib/data";
import {
  BUCKET_NEWS,
  IMAGE_TYPES,
  removeFile,
  uploadFile,
  validateFile,
} from "@/lib/storage";
import type { FormState } from "@/lib/form";

const schema = z.object({
  title: z.string().min(2, "Ange en rubrik."),
  excerpt: z.string().min(2, "Ange en kort ingress."),
  body: z.string().min(2, "Skriv nyhetstexten."),
  published: z.boolean(),
});

function parse(formData: FormData) {
  return schema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    published: formData.get("published") === "on",
  });
}

/** Vald bildfil, eller null om fältet lämnades tomt. */
function imageFile(formData: FormData): File | null {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : null;
}

/**
 * Laddar upp en ny bild eller tar bort den gamla, och städar bort den fil som
 * ersätts. Returnerar ett felmeddelande om bilden inte gick att spara.
 */
async function applyImage(newsId: string, formData: FormData): Promise<string | null> {
  const file = imageFile(formData);
  if (file) {
    const err = validateFile(file, IMAGE_TYPES);
    if (err) return err;
    const up = await uploadFile(BUCKET_NEWS, newsId, file);
    if (!up.ok) return up.error;
    const old = await setNewsImage(newsId, up.path);
    if (old) await removeFile(BUCKET_NEWS, old);
  } else if (formData.get("removeImage") === "on") {
    const old = await setNewsImage(newsId, null);
    if (old) await removeFile(BUCKET_NEWS, old);
  }
  return null;
}

function revalidate() {
  revalidatePath("/admin/nyheter");
  revalidatePath("/nyheter");
  // Artikelsidorna med: en avpublicerad nyhet ska inte ligga kvar.
  revalidatePath("/nyheter/[slug]", "page");
  revalidatePath("/");
}

export async function createNewsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  // Kontrollera bilden innan nyheten skapas, så att ett fel inte lämnar en
  // halvfärdig nyhet efter sig.
  const file = imageFile(formData);
  if (file) {
    const err = validateFile(file, IMAGE_TYPES);
    if (err) return { error: err };
  }
  const post = await createNews(parsed.data);
  const imageError = await applyImage(post.id, formData);
  revalidate();
  if (imageError) {
    return { error: `Nyheten sparades, men bilden kunde inte laddas upp: ${imageError}` };
  }
  redirect("/admin/nyheter");
}

export async function updateNewsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = parse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  await updateNews(id, parsed.data);
  const imageError = await applyImage(id, formData);
  revalidate();
  if (imageError) {
    return { error: `Texten sparades, men bilden kunde inte laddas upp: ${imageError}` };
  }
  redirect("/admin/nyheter");
}

export async function deleteNewsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const imagePath = await deleteNews(id);
  if (imagePath) await removeFile(BUCKET_NEWS, imagePath);
  revalidate();
}
