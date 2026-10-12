import type { Notice as DbNotice } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { BUCKET_NEWS, getPublicUrl } from "@/lib/storage";

/**
 * Anslag på trapphustavlorna. Styrelsen skriver dem under Admin →
 * Trapphustavlor. Ett anslag visas från startsAt till endsAt (tomt = tills
 * vidare) i alla hus, eller bara i det valda.
 *
 * Bilderna ligger i den publika news-images-bucketen under anslag/<id>.
 */

export interface Notice {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  buildingId: string | null;
  buildingName: string | null;
  pinned: boolean;
}

type Row = DbNotice & { building?: { name: string } | null };

function toNotice(n: Row): Notice {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    imageUrl: n.imagePath ? getPublicUrl(BUCKET_NEWS, n.imagePath) : null,
    startsAt: n.startsAt.toISOString(),
    endsAt: n.endsAt?.toISOString() ?? null,
    buildingId: n.buildingId,
    buildingName: n.building?.name ?? null,
    pinned: n.pinned,
  };
}

const ORDER = [{ pinned: "desc" as const }, { startsAt: "desc" as const }];

/** Alla anslag (admin), nyast först. */
export async function getAllNotices(): Promise<Notice[]> {
  const { db } = await getTenantDb();
  const rows = await db.notice.findMany({
    orderBy: ORDER,
    include: { building: { select: { name: true } } },
  });
  return rows.map(toNotice);
}

export async function getNoticeById(id: string): Promise<Notice | null> {
  const { db } = await getTenantDb();
  const row = await db.notice.findFirst({
    where: { id },
    include: { building: { select: { name: true } } },
  });
  return row ? toNotice(row) : null;
}

/**
 * Anslagen en skärm ska känna till: de som visas nu och de som börjar inom ett
 * dygn. Skärmen filtrerar själv på tiden, så att ett anslag dyker upp och
 * försvinner i rätt stund även när nätet ligger nere.
 */
export async function getNoticesForBuilding(buildingId: string | null): Promise<Notice[]> {
  const { db } = await getTenantDb();
  const now = new Date();
  const soon = new Date(now.getTime() + 86_400_000);
  const rows = await db.notice.findMany({
    where: {
      startsAt: { lte: soon },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      AND: [{ OR: [{ buildingId: null }, ...(buildingId ? [{ buildingId }] : [])] }],
    },
    orderBy: ORDER,
    take: 20,
  });
  return rows.map(toNotice);
}

export interface NoticeInput {
  title: string;
  body: string;
  startsAt: Date;
  endsAt: Date | null;
  buildingId: string | null;
  pinned: boolean;
}

export async function createNotice(input: NoticeInput): Promise<{ id: string }> {
  const { db, associationId } = await getTenantDb();
  const row = await db.notice.create({ data: { associationId, ...input } });
  return { id: row.id };
}

export async function updateNotice(id: string, input: NoticeInput): Promise<void> {
  const { db } = await getTenantDb();
  await db.notice.updateMany({ where: { id }, data: input });
}

/** Avslutar anslaget nu, utan att ta bort det. */
export async function endNotice(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.notice.updateMany({ where: { id }, data: { endsAt: new Date() } });
}

/** Sätter (eller tar bort) bilden. Returnerar den gamla sökvägen för städning. */
export async function setNoticeImage(
  id: string,
  imagePath: string | null,
): Promise<string | null> {
  const { db } = await getTenantDb();
  const existing = await db.notice.findFirst({
    where: { id },
    select: { imagePath: true },
  });
  if (!existing) return null;
  await db.notice.updateMany({ where: { id }, data: { imagePath } });
  return existing.imagePath;
}

/** Tar bort anslaget och returnerar bildens sökväg (för storage-städning). */
export async function deleteNotice(id: string): Promise<string | null> {
  const { db } = await getTenantDb();
  const existing = await db.notice.findFirst({
    where: { id },
    select: { imagePath: true },
  });
  await db.notice.deleteMany({ where: { id } });
  return existing?.imagePath ?? null;
}
