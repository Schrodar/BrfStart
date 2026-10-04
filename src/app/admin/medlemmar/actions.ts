"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  createInvitation,
  deleteMember,
  revokeInvitation,
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

export interface InviteState {
  ok: boolean;
  message: string;
  /** Engångslänken. Finns bara i svaret – token sparas aldrig i klartext. */
  link: string;
  email: string;
  fullName: string;
  role: "admin" | "member";
  expiresAt: string;
}

const inviteSchema = z.object({
  email: z.email("Ogiltig e-postadress."),
  fullName: z.string().trim().min(2, "Ange namnet.").max(200),
  apartment: z.string().trim().max(50),
  role: z.enum(["admin", "member"]),
  canManageListing: z.boolean(),
});

/**
 * Sajtens adress för länken. Byggs av förfrågan, eftersom samma kod körs på
 * flera domäner (en deploy per förening).
 */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Styrelsen bjuder in en boende eller en ny admin. Länken visas en gång och
 * skickas av styrelsen själv – den här sajten skickar ingen e-post.
 */
export async function createInvitationAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await requireAdmin();
  const empty = {
    link: "",
    email: "",
    fullName: "",
    role: "member" as const,
    expiresAt: "",
  };

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    fullName: String(formData.get("fullName") ?? ""),
    apartment: String(formData.get("apartment") ?? ""),
    role: formData.get("role"),
    canManageListing: formData.get("canManageListing") === "on",
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter.",
      ...empty,
    };
  }

  const input = parsed.data;
  const result = await createInvitation({ ...input, invitedBy: user.fullName });
  if (!result.ok) return { ok: false, message: result.error, ...empty };

  revalidate();
  return {
    ok: true,
    message: "Inbjudan skapad. Skicka länken till personen.",
    link: `${await siteOrigin()}/aktivera?token=${result.token}`,
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await revokeInvitation(String(formData.get("id") ?? ""));
  revalidate();
}
