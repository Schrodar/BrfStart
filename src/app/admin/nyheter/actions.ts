"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createNews, deleteNews, updateNews } from "@/lib/data";
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
  await createNews(parsed.data);
  revalidate();
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
  revalidate();
  redirect("/admin/nyheter");
}

export async function deleteNewsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await deleteNews(id);
  revalidate();
}
