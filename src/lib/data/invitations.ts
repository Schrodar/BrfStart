import { createHash, randomBytes } from "node:crypto";
import { getTenantDb } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { knowsPassword } from "@/lib/supabase/password-check";
import type { Role } from "@/lib/types";

/**
 * Inbjudningar till föreningen. De skapas i JnM-panelen eller av styrelsen
 * (Admin → Medlemmar) och löses in på /aktivera.
 *
 * En inbjudan ger ingen åtkomst i sig. Member-raden skapas först vid inlösen,
 * när personen har valt eller bekräftat sitt lösenord – annars skulle en i
 * förväg skapad admin-rad kunna tas över av den som först registrerar adressen.
 *
 * Uppslagen går via den tenant-scopade klienten, så en token som hör till en
 * annan förening ger ingen träff. Allt avvikande behandlas likadant: null.
 */

/** Hur länge en inbjudan går att lösa in. Samma i JnM-panelen. */
export const INVITE_DAYS = 7;

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

type TenantDb = Awaited<ReturnType<typeof getTenantDb>>["db"];

/**
 * Id för inloggningskontot med den här adressen, om det finns. Rå SQL mot
 * auth-schemat går förbi tenant-extensionen, men auth.users är inte
 * föreningsdata – konton är gemensamma för alla föreningar.
 */
async function findAccountId(db: TenantDb, email: string): Promise<string | null> {
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`;
  return rows[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Skapa, lista, återkalla (styrelsen)
// ---------------------------------------------------------------------------

export interface InvitationInput {
  email: string;
  fullName: string;
  apartment: string;
  role: Role;
  canManageListing: boolean;
  invitedBy: string;
}

export type CreateInvitationResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; error: string };

/**
 * Styrelsens inbjudan. Får aldrig byta lösenord på ett befintligt konto
 * (resetsPassword: false) – det får bara plattformsägaren.
 */
export async function createInvitation(
  input: InvitationInput,
): Promise<CreateInvitationResult> {
  const { db, associationId } = await getTenantDb();
  const email = input.email.trim().toLowerCase();

  const existing = await db.member.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: `${email} finns redan i föreningen. Ändra roll eller godkänn under Medlemmar i stället.`,
    };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86_400_000);
  await db.memberInvitation.create({
    data: {
      associationId,
      email,
      fullName: input.fullName.trim(),
      apartment: input.role === "member" ? input.apartment.trim() : "",
      role: input.role,
      canManageListing: input.role === "member" && input.canManageListing,
      invitedBy: input.invitedBy,
      resetsPassword: false,
      tokenHash: digest(token),
      expiresAt,
    },
  });
  return { ok: true, token, expiresAt };
}

export type InvitationState = "väntar" | "aktiverad" | "utgången" | "återkallad";

export interface InvitationItem {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  canManageListing: boolean;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  emailedAt: string | null;
  state: InvitationState;
}

export async function listInvitations(): Promise<InvitationItem[]> {
  const { db } = await getTenantDb();
  const rows = await db.memberInvitation.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const now = new Date();
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    canManageListing: row.canManageListing,
    invitedBy: row.invitedBy,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    usedAt: row.usedAt?.toISOString() ?? null,
    emailedAt: row.emailedAt?.toISOString() ?? null,
    state: row.usedAt
      ? "aktiverad"
      : row.revokedAt
        ? "återkallad"
        : row.expiresAt <= now
          ? "utgången"
          : "väntar",
  }));
}

/** Återkallar en inbjudan som inte har lösts in. */
export async function revokeInvitation(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.memberInvitation.updateMany({
    where: { id, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Inlösen (/aktivera)
// ---------------------------------------------------------------------------

/**
 * Hur aktiveringen går till:
 *   new    – inget konto finns: personen väljer lösenord
 *   reset  – konto finns, plattformsägarens inbjudan: personen väljer nytt lösenord
 *   verify – konto finns, styrelsens inbjudan: personen skriver sitt befintliga
 */
export type ActivationMode = "new" | "reset" | "verify";

export interface OpenInvitation {
  email: string;
  fullName: string;
  apartment: string;
  role: Role;
}

export async function getActivation(
  token: string,
): Promise<{ invitation: OpenInvitation; mode: ActivationMode } | null> {
  if (!token) return null;
  const { db } = await getTenantDb();
  const row = await db.memberInvitation.findFirst({
    where: openWhere(token),
    select: {
      email: true,
      fullName: true,
      apartment: true,
      role: true,
      resetsPassword: true,
    },
  });
  if (!row) return null;

  const { resetsPassword, ...invitation } = row;
  const accountId = await findAccountId(db, row.email);
  const mode: ActivationMode = !accountId ? "new" : resetsPassword ? "reset" : "verify";
  return { invitation, mode };
}

export type RedeemResult =
  | { ok: true; email: string; role: Role }
  | { ok: false; error: string };

const INVALID = "Länken är ogiltig eller har gått ut. Be om en ny inbjudan.";

/**
 * Löser in inbjudan och skapar eller uppdaterar medlemmen i föreningen.
 *
 * Finns inget konto skapas det med det valda lösenordet. Finns kontot redan:
 *   - plattformsägarens inbjudan byter lösenordet. Konton är globala och
 *     självregistreringen bekräftar inte e-posten, så någon annan kan ha skapat
 *     kontot i förväg – den som fått länken från plattformsägaren tar över det.
 *   - styrelsens inbjudan kräver kontots befintliga lösenord. Annars kunde en
 *     styrelse bjuda in vilken adress som helst och byta lösenordet själv.
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

  const fail = async (error: string): Promise<RedeemResult> => {
    await db.memberInvitation.updateMany({
      where: { id: invitation.id },
      data: { usedAt: null },
    });
    return { ok: false, error };
  };

  const email = invitation.email;
  const admin = createSupabaseAdminClient();
  const accountId = await findAccountId(db, email);

  if (!accountId) {
    const { error } = await admin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
    });
    if (error) return fail("Kontot kunde inte skapas. Försök igen.");
  } else if (invitation.resetsPassword) {
    const { error } = await admin.auth.admin.updateUserById(accountId, {
      password: input.password,
      email_confirm: true,
    });
    if (error) return fail("Kontot kunde inte uppdateras. Försök igen.");
  } else if (!(await knowsPassword(email, input.password))) {
    return fail(
      "Fel lösenord för ditt befintliga konto. Har du glömt det, be styrelsen kontakta JnM om en ny inbjudan.",
    );
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
