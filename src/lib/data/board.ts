import type {
  BoardGroup as DbBoardGroup,
  BoardMember as DbBoardMember,
} from "@prisma/client";
import type {
  BoardGroup,
  BoardGroupWithMembers,
  BoardMember,
} from "@/lib/types";
import { getTenantDb } from "@/lib/tenant";

function toGroup(g: DbBoardGroup): BoardGroup {
  return { id: g.id, name: g.name, order: g.sortOrder };
}

function toBoard(b: DbBoardMember): BoardMember {
  return {
    id: b.id,
    groupId: b.groupId,
    role: b.role,
    name: b.name,
    email: b.email,
    order: b.sortOrder,
  };
}

// ---------------------------------------------------------------------------
// Grupper
// ---------------------------------------------------------------------------

export async function getBoardGroups(): Promise<BoardGroup[]> {
  const { db } = await getTenantDb();
  const rows = await db.boardGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toGroup);
}

export type BoardGroupResult =
  | { ok: true; group: BoardGroup }
  | { ok: false; error: string };

/** Nya grupper hamnar sist – ordningen ändras sedan genom att dra raderna. */
export async function createBoardGroup(
  name: string,
): Promise<BoardGroupResult> {
  const { db, associationId } = await getTenantDb();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ange ett gruppnamn." };

  const existing = await db.boardGroup.findFirst({ where: { name: trimmed } });
  if (existing) {
    return { ok: false, error: `Gruppen "${trimmed}" finns redan.` };
  }

  const last = await db.boardGroup.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const row = await db.boardGroup.create({
    data: {
      associationId,
      name: trimmed,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  return { ok: true, group: toGroup(row) };
}

/** Byter namn. Ordningen rörs inte – den styrs av reorderBoardGroups. */
export async function renameBoardGroup(
  id: string,
  name: string,
): Promise<BoardGroupResult> {
  const { db } = await getTenantDb();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ange ett gruppnamn." };

  const clash = await db.boardGroup.findFirst({
    where: { name: trimmed, NOT: { id } },
  });
  if (clash) return { ok: false, error: `Gruppen "${trimmed}" finns redan.` };

  await db.boardGroup.updateMany({ where: { id }, data: { name: trimmed } });
  const row = await db.boardGroup.findFirst({ where: { id } });
  if (!row) return { ok: false, error: "Gruppen hittades inte." };
  return { ok: true, group: toGroup(row) };
}

/**
 * Sätter gruppernas ordning efter en omsortering. Positionerna skrivs om till
 * 1..n, så numren i gränssnittet alltid är en obruten följd oavsett vilka
 * värden som stod där innan.
 *
 * Id:n som inte tillhör föreningen filtreras bort av den tenant-scopade
 * uppslagningen och ignoreras tyst – de kan bara komma från en manipulerad
 * begäran, aldrig från gränssnittet.
 */
export async function reorderBoardGroups(
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db } = await getTenantDb();
  const own = await db.boardGroup.findMany({ select: { id: true } });
  const ownIds = new Set(own.map((g) => g.id));

  const ids = orderedIds.filter((id) => ownIds.has(id));
  if (ids.length !== ownIds.size) {
    return { ok: false, error: "Ordningen matchar inte grupperna. Ladda om sidan." };
  }

  await Promise.all(
    ids.map((id, i) =>
      db.boardGroup.updateMany({ where: { id }, data: { sortOrder: i + 1 } }),
    ),
  );
  return { ok: true };
}

/**
 * Tar bort en tom grupp. Grupper med personer i vägrar vi radera – annars
 * försvinner personerna på köpet utan att någon har sagt åt oss att ta bort dem.
 */
export async function deleteBoardGroup(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db } = await getTenantDb();
  const group = await db.boardGroup.findFirst({ where: { id } });
  if (!group) return { ok: false, error: "Gruppen hittades inte." };

  const members = await db.boardMember.count({ where: { groupId: id } });
  if (members > 0) {
    return {
      ok: false,
      error: `"${group.name}" innehåller ${members} ${
        members === 1 ? "person" : "personer"
      }. Flytta eller ta bort dem först.`,
    };
  }

  await db.boardGroup.deleteMany({ where: { id } });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Personer
// ---------------------------------------------------------------------------

export async function getBoard(): Promise<BoardMember[]> {
  const { db } = await getTenantDb();
  const rows = await db.boardMember.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map(toBoard);
}

/** Grupperat för styrelsesidorna, i gruppernas sorteringsordning. */
export async function getBoardGrouped(): Promise<BoardGroupWithMembers[]> {
  const { db } = await getTenantDb();
  const groups = await db.boardGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { members: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  });
  return groups.map((g) => ({
    ...toGroup(g),
    members: g.members.map(toBoard),
  }));
}

export interface BoardMemberInput {
  groupId: string;
  role: string;
  name: string;
  email: string;
  order: number;
}

export type BoardMemberResult =
  | { ok: true; member: BoardMember }
  | { ok: false; error: string };

/**
 * Gruppen slås upp via den tenant-scopade klienten, så ett groupId från en
 * annan förening ger null här och avvisas – inte ett främmande-nyckel-fel.
 */
async function assertGroupExists(
  db: Awaited<ReturnType<typeof getTenantDb>>["db"],
  groupId: string,
): Promise<string | null> {
  const group = await db.boardGroup.findFirst({ where: { id: groupId } });
  return group ? null : "Välj en giltig grupp.";
}

export async function createBoardMember(
  input: BoardMemberInput,
): Promise<BoardMemberResult> {
  const { db, associationId } = await getTenantDb();
  const groupError = await assertGroupExists(db, input.groupId);
  if (groupError) return { ok: false, error: groupError };

  const row = await db.boardMember.create({
    data: {
      associationId,
      groupId: input.groupId,
      role: input.role,
      name: input.name,
      email: input.email,
      sortOrder: input.order,
    },
  });
  return { ok: true, member: toBoard(row) };
}

export async function updateBoardMember(
  id: string,
  input: BoardMemberInput,
): Promise<BoardMemberResult> {
  const { db } = await getTenantDb();
  const existing = await db.boardMember.findFirst({ where: { id } });
  if (!existing) return { ok: false, error: "Personen hittades inte." };

  const groupError = await assertGroupExists(db, input.groupId);
  if (groupError) return { ok: false, error: groupError };

  await db.boardMember.updateMany({
    where: { id },
    data: {
      groupId: input.groupId,
      role: input.role,
      name: input.name,
      email: input.email,
      sortOrder: input.order,
    },
  });
  const row = await db.boardMember.findFirst({ where: { id } });
  if (!row) return { ok: false, error: "Personen hittades inte." };
  return { ok: true, member: toBoard(row) };
}

export async function deleteBoardMember(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.boardMember.deleteMany({ where: { id } });
}

export async function getBoardMemberById(
  id: string,
): Promise<BoardMember | null> {
  const { db } = await getTenantDb();
  const row = await db.boardMember.findFirst({ where: { id } });
  return row ? toBoard(row) : null;
}
