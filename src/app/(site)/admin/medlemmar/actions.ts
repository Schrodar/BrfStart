"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSupport } from "@/lib/auth";
import {
  createInvitation,
  deleteMember,
  getMemberById,
  revokeInvitation,
} from "@/lib/data";
import { siteOrigin } from "@/lib/site-origin";

/*
 * Styrelsens personliga konton. De boende har lägenhetens konto, som sköts
 * under Hus och lägenheter. Bara plattformsägaren (JnM) i ett supportläge
 * bjuder in och tar bort admins.
 */

function revalidate() {
  revalidatePath("/admin/medlemmar");
  revalidatePath("/admin");
}

/**
 * Tar bort en admin ur föreningen. Bara Member-raden – inloggningen kan höra
 * till fler föreningar och städas av `npm run users:prune`. En lägenhet som
 * kontot var kopplat till släpps utan att något annat rörs.
 */
export async function removeAdminAction(formData: FormData): Promise<void> {
  await requireSupport();
  const id = String(formData.get("id") ?? "");
  const member = await getMemberById(id);
  if (member?.role !== "admin") return;
  await deleteMember(id);
  revalidate();
}

export interface InviteState {
  ok: boolean;
  message: string;
  /** Engångslänken. Finns bara i svaret – token sparas aldrig i klartext. */
  link: string;
  email: string;
  fullName: string;
  expiresAt: string;
}

const inviteSchema = z.object({
  email: z.email("Ogiltig e-postadress."),
  fullName: z.string().trim().min(2, "Ange namnet.").max(200),
});

/**
 * Bjuder in en ledamot som admin. Länken visas en gång och skickas av den som
 * bjuder in – den här sajten skickar ingen e-post.
 */
export async function createInvitationAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await requireSupport();
  const empty = { link: "", email: "", fullName: "", expiresAt: "" };

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    fullName: String(formData.get("fullName") ?? ""),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter.",
      ...empty,
    };
  }

  const input = parsed.data;
  const result = await createInvitation({
    ...input,
    apartment: "",
    role: "admin",
    canManageListing: false,
    invitedBy: user.fullName,
  });
  if (!result.ok) return { ok: false, message: result.error, ...empty };

  revalidate();
  return {
    ok: true,
    message: "Inbjudan skapad. Skicka länken till personen.",
    link: `${await siteOrigin()}/aktivera?token=${result.token}`,
    email: input.email,
    fullName: input.fullName,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function revokeInvitationAction(formData: FormData): Promise<void> {
  await requireSupport();
  await revokeInvitation(String(formData.get("id") ?? ""));
  revalidate();
}
