"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  deleteMember,
  setMemberCanManageListing,
  setMemberRole,
  setMemberStatus,
} from "@/lib/data";
import { notifyMemberApproved } from "@/lib/email";

function revalidate() {
  revalidatePath("/admin/medlemmar");
  revalidatePath("/admin");
}

export async function approveMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const member = await setMemberStatus(id, "approved");
  if (member) await notifyMemberApproved(member);
  revalidate();
}

export async function rejectMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await setMemberStatus(id, "rejected");
  revalidate();
}

export async function deleteMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await deleteMember(id);
  revalidate();
}

export async function setRoleAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "member";
  await setMemberRole(id, role);
  revalidate();
}

export async function setListingPermissionAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await setMemberCanManageListing(id, formData.get("value") === "1");
  revalidate();
}
