import type { Member as DbMember } from "@prisma/client";
import type { Member } from "@/lib/types";
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
