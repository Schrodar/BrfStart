import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getTenantDb } from "@/lib/tenant";

/**
 * Supportläge: plattformsadmin får tillgång till den här föreningens adminpanel
 * under en kort, loggad stund. Sessionen skapas i plattformspanelen och löses
 * in av /admin/support.
 *
 * Två skilda hemligheter, ingen i klartext i databasen:
 *   - länkens token  → tokenHash, engångs och kortlivad
 *   - sessionens cookie → cookieHash, skapas först här vid inlösen
 *
 * Uppslagen går via den tenant-scopade klienten, så en token som hör till en
 * annan förening ger ingen träff. Allt avvikande behandlas likadant: null.
 */

/** Namnet på supportcookien. Host-only, httpOnly och sameSite strict. */
export const SUPPORT_COOKIE = "brf_support";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export interface ActiveSupportSession {
  id: string;
  /** Vem i plattformen – loggraderna i supportloggen knyts hit. */
  platformAdminId: string;
  adminName: string;
  adminEmail: string;
  /** ISO-sträng. Visas i bannern så att det syns när åtkomsten upphör. */
  expiresAt: string;
}

/**
 * Löser in engångstoken och returnerar cookievärdet att sätta. Null om token är
 * okänd, redan använd, utgången eller hör till en annan förening.
 */
export async function redeemSupportToken(
  token: string,
): Promise<{ cookieValue: string; expiresAt: Date } | null> {
  if (!token) return null;
  const { db } = await getTenantDb();
  const now = new Date();

  const session = await db.supportSession.findFirst({
    where: {
      tokenHash: digest(token),
      usedAt: null,
      endedAt: null,
      linkExpiresAt: { gt: now },
      expiresAt: { gt: now },
    },
    select: { id: true, expiresAt: true },
  });
  if (!session) return null;

  const cookieValue = randomBytes(32).toString("hex");
  // Villkoret usedAt: null gör inlösen till en engångshändelse även om två
  // requests kommer samtidigt – bara den ena uppdaterar en rad.
  const claimed = await db.supportSession.updateMany({
    where: { id: session.id, usedAt: null },
    data: { usedAt: now, cookieHash: digest(cookieValue) },
  });
  if (claimed.count !== 1) return null;

  return { cookieValue, expiresAt: session.expiresAt };
}

/**
 * Sessionen bakom cookien, om den fortfarande gäller. Kontrolleras vid varje
 * request – ett avslut slår därför igenom direkt, även i en öppen flik.
 */
export async function getActiveSupportSession(
  cookieValue: string,
): Promise<ActiveSupportSession | null> {
  if (!cookieValue) return null;
  const { db } = await getTenantDb();

  const session = await db.supportSession.findFirst({
    where: {
      cookieHash: digest(cookieValue),
      endedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      platformAdminId: true,
      adminName: true,
      adminEmail: true,
      expiresAt: true,
    },
  });
  if (!session) return null;

  return {
    id: session.id,
    platformAdminId: session.platformAdminId,
    adminName: session.adminName,
    adminEmail: session.adminEmail,
    expiresAt: session.expiresAt.toISOString(),
  };
}

/** Avslutar sessionen direkt (knappen i bannern). */
export async function endSupportSession(cookieValue: string): Promise<void> {
  if (!cookieValue) return;
  const { db } = await getTenantDb();
  await db.supportSession.updateMany({
    where: { cookieHash: digest(cookieValue), endedAt: null },
    data: { endedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Supportloggen (Admin → Supportlogg)
// ---------------------------------------------------------------------------

export type SupportLogStatus = "pagar" | "avslutad" | "utgangen" | "oanvand";

export interface SupportLogEntry {
  id: string;
  adminName: string;
  reason: string;
  status: SupportLogStatus;
  /** ISO-strängar. startedAt = när länken skapades, usedAt = när den öppnades. */
  startedAt: string;
  usedAt: string | null;
  /** När åtkomsten upphörde eller upphör: avslutet, annars utgångstiden. */
  endsAt: string;
  changes: { id: string; at: string; summary: string }[];
}

/**
 * De senaste supportsessionerna med allt som ändrades under dem. Ändringarna
 * skrivs av src/lib/support-log.ts till AuditEvent, som inte är tenant-scopad –
 * därav bas-klienten med explicit associationId.
 */
export async function getSupportLog(limit = 20): Promise<SupportLogEntry[]> {
  const { db, associationId } = await getTenantDb();
  const sessions = await db.supportSession.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      adminName: true,
      reason: true,
      startedAt: true,
      usedAt: true,
      expiresAt: true,
      endedAt: true,
    },
  });
  if (sessions.length === 0) return [];

  const events = await prisma.auditEvent.findMany({
    where: {
      associationId,
      action: "support.change",
      target: { in: sessions.map((s) => s.id) },
    },
    orderBy: { at: "asc" },
    select: { id: true, at: true, target: true, summary: true },
  });

  const now = Date.now();
  return sessions.map((s) => {
    // Oöppnad länk räknas som oanvänd oavsett om den hunnit gå ut – ingen
    // har kommit åt något.
    const status: SupportLogStatus = !s.usedAt
      ? "oanvand"
      : s.endedAt
        ? "avslutad"
        : s.expiresAt.getTime() <= now
          ? "utgangen"
          : "pagar";
    return {
      id: s.id,
      adminName: s.adminName,
      reason: s.reason,
      status,
      startedAt: s.startedAt.toISOString(),
      usedAt: s.usedAt?.toISOString() ?? null,
      endsAt: (s.endedAt ?? s.expiresAt).toISOString(),
      changes: events
        .filter((e) => e.target === s.id)
        .map((e) => ({ id: e.id, at: e.at.toISOString(), summary: e.summary })),
    };
  });
}
