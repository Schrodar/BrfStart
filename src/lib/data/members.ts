import type { Member as DbMember } from "@prisma/client";
import type { Member, MemberStatus, Role } from "@/lib/types";
import { getTenantDb } from "@/lib/tenant";

function toMember(m: DbMember): Member {
  return {
    id: m.id,
    email: m.email,
    fullName: m.fullName,
    apartment: m.apartment,
    role: m.role,
    status: m.status,
    canManageListing: m.canManageListing,
    createdAt: m.createdAt.toISOString(),
  };
}

export async function getMembers(): Promise<Member[]> {
  const { db } = await getTenantDb();
  const rows = await db.member.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toMember);
}

export async function getPendingMembers(): Promise<Member[]> {
  const { db } = await getTenantDb();
  const rows = await db.member.findMany({ where: { status: "pending" } });
  return rows.map(toMember);
}

export async function getMemberById(id: string): Promise<Member | null> {
  const { db } = await getTenantDb();
  const row = await db.member.findFirst({ where: { id } });
  return row ? toMember(row) : null;
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  const { db } = await getTenantDb();
  const row = await db.member.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
  });
  return row ? toMember(row) : null;
}

export interface RegisterInput {
  email: string;
  fullName: string;
  apartment: string;
}

export type RegisterResult =
  | { ok: true; member: Member }
  | { ok: false; error: string };

/** Självregistrering – skapar en medlem med status "pending" (väntar godkännande). */
export async function registerMember(
  input: RegisterInput,
): Promise<RegisterResult> {
  const existing = await getMemberByEmail(input.email);
  if (existing) {
    return {
      ok: false,
      error: "Det finns redan ett konto med den e-postadressen.",
    };
  }
  const { db, associationId } = await getTenantDb();
  const row = await db.member.create({
    data: {
      associationId,
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      apartment: input.apartment.trim(),
      role: "member",
      status: "pending",
    },
  });
  return { ok: true, member: toMember(row) };
}

export async function setMemberStatus(
  id: string,
  status: MemberStatus,
): Promise<Member | null> {
  const { db } = await getTenantDb();
  await db.member.updateMany({ where: { id }, data: { status } });
  const row = await db.member.findFirst({ where: { id } });
  return row ? toMember(row) : null;
}

export async function setMemberRole(
  id: string,
  role: Role,
): Promise<Member | null> {
  const { db } = await getTenantDb();
  await db.member.updateMany({ where: { id }, data: { role } });
  const row = await db.member.findFirst({ where: { id } });
  return row ? toMember(row) : null;
}

export async function setMemberCanManageListing(
  id: string,
  value: boolean,
): Promise<void> {
  const { db } = await getTenantDb();
  await db.member.updateMany({
    where: { id },
    data: { canManageListing: value },
  });
}

export async function deleteMember(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.member.deleteMany({ where: { id } });
}
