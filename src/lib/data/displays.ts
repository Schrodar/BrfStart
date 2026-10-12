import { createHash, randomBytes } from "node:crypto";
import { getTenantDb } from "@/lib/tenant";

/**
 * Trapphustavlor. Varje skärm har en egen långlivad token som ligger i dess
 * adress (/tavla/<token>) och skickas med till /api/tavla. Bara tokenens
 * sha256 sparas, så adressen går inte att återskapa ur databasen – tappas den
 * bort får skärmen en ny token.
 *
 * Uppslagen går via den tenant-scopade klienten, så en token från en annan
 * förening ger ingen träff.
 */

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const newToken = () => randomBytes(32).toString("hex");

/** Hur länge en skärm räknas som igång efter sin senaste hämtning. */
export const DISPLAY_ONLINE_MINUTES = 5;

/** lastSeenAt skrivs högst så här ofta, inte vid varje hämtning. */
const SEEN_WRITE_MS = 5 * 60_000;

export interface DisplayItem {
  id: string;
  name: string;
  buildingId: string | null;
  buildingName: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  online: boolean;
}

export async function listDisplays(): Promise<DisplayItem[]> {
  const { db } = await getTenantDb();
  const rows = await db.display.findMany({
    where: { revokedAt: null },
    orderBy: { name: "asc" },
    include: { building: { select: { name: true } } },
  });
  // Lite marginal utöver hämtintervallet, så att en skärm inte blinkar röd
  // bara för att skrivningen av lastSeenAt glesas ut.
  const cutoff = Date.now() - (DISPLAY_ONLINE_MINUTES * 60_000 + SEEN_WRITE_MS);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    buildingId: row.buildingId,
    buildingName: row.building?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    online: !!row.lastSeenAt && row.lastSeenAt.getTime() > cutoff,
  }));
}

export interface DisplayInput {
  name: string;
  buildingId: string | null;
}

/** Skapar skärmen och returnerar dess token – den enda gången den syns. */
export async function createDisplay(
  input: DisplayInput,
): Promise<{ id: string; token: string }> {
  const { db, associationId } = await getTenantDb();
  const token = newToken();
  const row = await db.display.create({
    data: {
      associationId,
      name: input.name.trim(),
      buildingId: input.buildingId,
      tokenHash: digest(token),
    },
  });
  return { id: row.id, token };
}

export async function updateDisplay(id: string, input: DisplayInput): Promise<void> {
  const { db } = await getTenantDb();
  await db.display.updateMany({
    where: { id, revokedAt: null },
    data: { name: input.name.trim(), buildingId: input.buildingId },
  });
}

/** Ny token: den gamla adressen slutar fungera direkt. */
export async function regenerateDisplayToken(id: string): Promise<string | null> {
  const { db } = await getTenantDb();
  const token = newToken();
  const updated = await db.display.updateMany({
    where: { id, revokedAt: null },
    data: { tokenHash: digest(token), lastSeenAt: null },
  });
  return updated.count === 1 ? token : null;
}

/** Tar bort skärmen. Raden ligger kvar som återkallad, adressen slutar fungera. */
export async function revokeDisplay(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.display.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export interface ResolvedDisplay {
  id: string;
  name: string;
  building: { id: string; name: string; address: string } | null;
}

/**
 * Skärmen som hör till token, eller null. Noterar samtidigt att skärmen är
 * igång – men skriver högst var femte minut, så att en skärm som hämtar varje
 * minut inte ger en databasskrivning varje minut.
 */
export async function getDisplayByToken(token: string): Promise<ResolvedDisplay | null> {
  if (!token) return null;
  const { db } = await getTenantDb();
  const row = await db.display.findFirst({
    where: { tokenHash: digest(token), revokedAt: null },
    include: { building: { select: { id: true, name: true, address: true } } },
  });
  if (!row) return null;

  const now = Date.now();
  if (!row.lastSeenAt || now - row.lastSeenAt.getTime() > SEEN_WRITE_MS) {
    await db.display.updateMany({
      where: { id: row.id },
      data: { lastSeenAt: new Date(now) },
    });
  }
  return { id: row.id, name: row.name, building: row.building };
}

// ---------------------------------------------------------------------------
// Inställningar
// ---------------------------------------------------------------------------

export interface DisplaySettings {
  showNews: boolean;
  /** "HH:MM". Lika värden = skärmen släcks aldrig. */
  nightStart: string;
  nightEnd: string;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showNews: true,
  nightStart: "23:00",
  nightEnd: "06:00",
};

export async function getDisplaySettings(): Promise<DisplaySettings> {
  const { db } = await getTenantDb();
  const row = await db.displaySettings.findFirst();
  if (!row) return DEFAULT_DISPLAY_SETTINGS;
  return {
    showNews: row.showNews,
    nightStart: row.nightStart,
    nightEnd: row.nightEnd,
  };
}

export async function updateDisplaySettings(input: DisplaySettings): Promise<void> {
  const { db, associationId } = await getTenantDb();
  const existing = await db.displaySettings.findFirst({ select: { id: true } });
  if (existing) {
    await db.displaySettings.updateMany({ where: { id: existing.id }, data: input });
  } else {
    await db.displaySettings.create({ data: { associationId, ...input } });
  }
}
