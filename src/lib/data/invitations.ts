import { createHash } from "node:crypto";
import { getTenantDb } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

/**
 * Inbjudningar från plattformspanelen. Panelen skapar raden och visar en
 * engångslänk; den här appen löser in den på /aktivera.
 *
 * En inbjudan ger ingen åtkomst i sig. Member-raden skapas först här, när
 * personen har valt sitt lösenord – annars skulle en i förväg skapad admin-rad
 * kunna tas över av den som först registrerar e-postadressen.
 *
 * Uppslagen går via den tenant-scopade klienten, så en token som hör till en
 * annan förening ger ingen träff. Allt avvikande behandlas likadant: null.
 */

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Villkoren för en länk som fortfarande går att lösa in. */
function openWhere(token: string) {
  return {
    tokenHash: digest(token),
    usedAt: null,
    revokedAt: null,
    expiresAt: { gt: new Date() },
  };
}

export interface OpenInvitation {
  email: string;
  fullName: string;
  apartment: string;
  role: Role;
}

export async function getOpenInvitation(token: string): Promise<OpenInvitation | null> {
  if (!token) return null;
  const { db } = await getTenantDb();
  const row = await db.memberInvitation.findFirst({
    where: openWhere(token),
    select: { email: true, fullName: true, apartment: true, role: true },
  });
  return row;
}

export type RedeemResult =
  | { ok: true; email: string; role: Role }
  | { ok: false; error: string };

const INVALID = "Länken är ogiltig eller har gått ut. Be om en ny inbjudan.";

/**
 * Löser in inbjudan: skapar inloggningskontot (eller byter lösenord på ett
 * befintligt) och skapar eller uppdaterar medlemmen i den här föreningen.
 *
 * Att lösenordet byts på ett befintligt konto är avsiktligt. Konton är globala
 * och självregistreringen bekräftar inte e-posten, så någon annan kan ha
 * skapat kontot i förväg. Den som har länken – som panelen gav till rätt
 * person – får då kontrollen, och ett lösenord som någon annan valt slutar gälla.
 */
export async function redeemInvitation(
  token: string,
  input: { fullName: string; apartment: string; password: string },
): Promise<RedeemResult> {
  if (!token) return { ok: false, error: INVALID };
  const { db, associationId } = await getTenantDb();

  const invitation = await db.memberInvitation.findFirst({
    where: openWhere(token),
  });
  if (!invitation) return { ok: false, error: INVALID };

  // Villkoret usedAt: null gör inlösen till en engångshändelse även om två
  // requests kommer samtidigt – bara den ena uppdaterar raden.
  const claimed = await db.memberInvitation.updateMany({
    where: { id: invitation.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, error: INVALID };

  const release = () =>
    db.memberInvitation.updateMany({
      where: { id: invitation.id },
      data: { usedAt: null },
    });

  const email = invitation.email;
  const admin = createSupabaseAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    const exists =
      msg.includes("registered") || msg.includes("already") || msg.includes("exists");
    if (!exists) {
      await release();
      return { ok: false, error: "Kontot kunde inte skapas. Försök igen." };
    }
    // Kontot finns redan: slå upp det och byt lösenord. Rå SQL mot auth-schemat
    // går förbi tenant-extensionen, men auth.users är inte föreningsdata.
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id::text AS id FROM auth.users WHERE lower(email) = ${email} LIMIT 1`;
    const userId = rows[0]?.id;
    const { error: updateError } = userId
      ? await admin.auth.admin.updateUserById(userId, {
          password: input.password,
          email_confirm: true,
        })
      : { error: new Error("saknas") };
    if (updateError) {
      await release();
      return { ok: false, error: "Kontot kunde inte uppdateras. Försök igen." };
    }
  }

  // Styrelsens admins anger ofta ingen lägenhet. Ett tomt fält ska inte sudda
  // ut en lägenhet som en befintlig medlem redan har.
  const apartment = input.apartment.trim() || invitation.apartment;
  const member = {
    fullName: input.fullName.trim() || invitation.fullName,
    ...(apartment ? { apartment } : {}),
    role: invitation.role,
    status: "approved" as const,
    canManageListing: invitation.canManageListing,
  };
  // E-post jämförs utan skiftläge, precis som vid inloggningen – annars kunde
  // en tidigare registrering med versaler ge två medlemsrader.
  const existing = await db.member.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    await db.member.update({ where: { id: existing.id }, data: member });
  } else {
    await db.member.create({ data: { associationId, email, ...member } });
  }

  return { ok: true, email, role: invitation.role };
}
