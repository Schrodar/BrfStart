"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  createBoardGroup,
  createBoardMember,
  deleteBoardGroup,
  deleteBoardMember,
  renameBoardGroup,
  reorderBoardGroups,
  updateBoardMember,
} from "@/lib/data";
import type { FormState } from "@/lib/form";

const memberSchema = z.object({
  groupId: z.string().min(1, "Välj en grupp."),
  role: z.string().min(1, "Ange en roll."),
  name: z.string().min(1, "Ange ett namn."),
  email: z.union([z.string().email("Ogiltig e-post."), z.literal("")]).default(""),
  order: z.coerce.number().int().min(0).default(0),
});

const groupSchema = z.object({
  name: z.string().min(1, "Ange ett gruppnamn."),
});

function parseMember(formData: FormData) {
  return memberSchema.safeParse({
    groupId: formData.get("groupId"),
    role: formData.get("role"),
    name: formData.get("name"),
    email: String(formData.get("email") || ""),
    order: formData.get("order") || 0,
  });
}

function revalidate() {
  revalidatePath("/admin/styrelse");
  revalidatePath("/styrelse");
}

// ---------------------------------------------------------------------------
// Grupper
// ---------------------------------------------------------------------------

export async function createBoardGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = groupSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await createBoardGroup(parsed.data.name);
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: `Gruppen "${result.group.name}" skapades.` };
}

export async function renameBoardGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = groupSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const result = await renameBoardGroup(id, parsed.data.name);
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: `Gruppen "${result.group.name}" sparades.` };
}

/**
 * Anropas direkt från klienten efter ett släpp, inte via ett formulär – hela
 * ordningen skickas som en lista med id:n i den nya följden.
 */
export async function reorderBoardGroupsAction(
  orderedIds: string[],
): Promise<FormState> {
  await requireAdmin();
  const result = await reorderBoardGroups(orderedIds);
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: "Ordningen sparad." };
}

export async function deleteBoardGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const result = await deleteBoardGroup(id);
  if (!result.ok) return { error: result.error };
  revalidate();
  return { success: "Gruppen togs bort." };
}

// ---------------------------------------------------------------------------
// Personer
// ---------------------------------------------------------------------------

export async function createBoardMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const parsed = parseMember(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const result = await createBoardMember(parsed.data);
  if (!result.ok) return { error: result.error };
  revalidate();
  redirect("/admin/styrelse");
}

export async function updateBoardMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = parseMember(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const result = await updateBoardMember(id, parsed.data);
  if (!result.ok) return { error: result.error };
  revalidate();
  redirect("/admin/styrelse");
}

export async function deleteBoardMemberAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await deleteBoardMember(id);
  revalidate();
}
