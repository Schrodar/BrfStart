import { getTenantDb } from "@/lib/tenant";
import { compareApartmentNumbers } from "@/lib/numbering";
import { isApartmentAccountEmail } from "./access-codes";
import { findAuthUserId } from "./auth-users";

/**
 * =============================================================================
 * KONTON – styrelsens admins och lägenheternas konton (supportläget)
 * =============================================================================
 * En ledamot använder sin lägenhets konto. JnM ger kontot admin-rätt och tar
 * bort den när ledamoten lämnar styrelsen. Säljs lägenheten raderas kontot, och
 * admin-rätten med det (deleteApartmentAccount).
 *
 * Personliga admin-konton med e-post finns kvar som undantag: en ledamot som
 * inte bor i föreningen bjuds in från JnM-panelen eller med admin:invite.
 */

export interface AdminAccount {
  memberId: string;
  /** apartment = lägenhetens konto med admin-rätt. personal = konto med e-post. */
  kind: "apartment" | "personal";
  /** "Lägenhet 31" eller personens namn. */
  name: string;
  /** Personliga konton: e-posten. Tom för lägenhetens konto, vars adress är intern. */
  email: string;
  /** Lägenheten och huset, när kontot hör till en lägenhet. */
  apartment: { id: string; number: string; buildingName: string } | null;
  /** Inloggningen finns i Supabase. Annars kan kontot inte logga in. */
  hasLogin: boolean;
  /** Konton från tiden med godkännande kan vara spärrade. */
  approved: boolean;
}

/** Föreningens admins: lägenheternas konton i nummerordning, sedan de personliga. */
export async function getAdminAccounts(): Promise<AdminAccount[]> {
  const { db } = await getTenantDb();
  const rows = await db.member.findMany({
    where: { role: "admin" },
    select: {
      id: true,
      email: true,
      fullName: true,
      status: true,
      ownedApartment: {
        select: { id: true, number: true, building: { select: { name: true } } },
      },
    },
  });

  const accounts = await Promise.all(
    rows.map(async (m): Promise<AdminAccount> => {
      const kind = isApartmentAccountEmail(m.email) ? "apartment" : "personal";
      return {
        memberId: m.id,
        kind,
        name: m.fullName,
        email: kind === "personal" ? m.email : "",
        apartment: m.ownedApartment
          ? {
              id: m.ownedApartment.id,
              number: m.ownedApartment.number,
              buildingName: m.ownedApartment.building?.name ?? "",
            }
          : null,
        hasLogin: Boolean(await findAuthUserId(m.email)),
        approved: m.status === "approved",
      };
    }),
  );

  return accounts.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "apartment" ? -1 : 1;
    if (a.apartment && b.apartment) {
      return compareApartmentNumbers(a.apartment.number, b.apartment.number);
    }
    return a.name.localeCompare(b.name, "sv");
  });
}

/** Lägenhetens konto, så som det syns i sökningen. */
export type ApartmentAccountState =
  /** Ingen kod och inget konto. */
  | "ingen-kod"
  /** Koden finns men har inte använts. */
  | "kod-skapad"
  /** Lägenhetens konto finns. */
  | "aktiverat"
  /** Lägenhetens konto har admin-rätt. */
  | "admin"
  /** Ett personligt konto från tiden med registrering. */
  | "personligt";

export interface ApartmentHit {
  id: string;
  number: string;
  standardNumber: string;
  buildingName: string;
  buildingAddress: string;
  /** Lägenheten har en kod – som kanske redan har använts. */
  hasCode: boolean;
  codeCreatedAt: string | null;
  state: ApartmentAccountState;
  /** Kontots Member-id, när lägenheten har ett konto. */
  memberId: string | null;
  /** När kontot skapades, när lägenheten har ett konto. */
  activatedAt: string | null;
}

const SEARCH_LIMIT = 20;

/**
 * Söker bland föreningens alla lägenheter – i alla hus och bland dem utan hus.
 * Föreningens nummer matchas från början ("3" ger 3 och 30–39), Lantmäteriets
 * nummer bara exakt: annars skulle en kort sökning ge varje lägenhet på ett
 * våningsplan. Exakta träffar kommer först. "31/1203", som numret visas i
 * registret, går också att söka på.
 */
export async function searchApartments(query: string): Promise<ApartmentHit[]> {
  const value = query.split("/")[0].trim();
  if (!value) return [];

  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({
    where: {
      OR: [
        { number: { startsWith: value, mode: "insensitive" } },
        { standardNumber: { equals: value, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      number: true,
      standardNumber: true,
      accessCodeCreatedAt: true,
      building: { select: { name: true, address: true } },
      owner: { select: { id: true, email: true, role: true, createdAt: true } },
    },
    orderBy: { number: "asc" },
    take: 100,
  });

  const wanted = value.toLowerCase();
  const exact = (r: (typeof rows)[number]) =>
    r.number.toLowerCase() === wanted || r.standardNumber.toLowerCase() === wanted;
  rows.sort(
    (a, b) =>
      Number(exact(b)) - Number(exact(a)) || compareApartmentNumbers(a.number, b.number),
  );

  return rows.slice(0, SEARCH_LIMIT).map((r) => {
    const owner = r.owner;
    const state: ApartmentAccountState = owner
      ? !isApartmentAccountEmail(owner.email)
        ? "personligt"
        : owner.role === "admin"
          ? "admin"
          : "aktiverat"
      : r.accessCodeCreatedAt
        ? "kod-skapad"
        : "ingen-kod";
    return {
      id: r.id,
      number: r.number,
      standardNumber: r.standardNumber,
      buildingName: r.building?.name ?? "",
      buildingAddress: r.building?.address ?? "",
      hasCode: Boolean(r.accessCodeCreatedAt),
      codeCreatedAt: r.accessCodeCreatedAt?.toISOString() ?? null,
      state,
      memberId: owner?.id ?? null,
      activatedAt: owner?.createdAt.toISOString() ?? null,
    };
  });
}

/**
 * Ger lägenhetens konto admin-rätt. Bara lägenhetens eget konto: ett gammalt
 * personligt konto från tiden med registrering kan inte bli admin den här
 * vägen – lägenheten behöver då använda en kod först. Returnerar false om
 * lägenheten saknar ett sådant konto.
 */
export async function grantApartmentAdmin(apartmentId: string): Promise<boolean> {
  const { db } = await getTenantDb();
  const apartment = await db.apartment.findFirst({
    where: { id: apartmentId },
    select: { owner: { select: { id: true, email: true } } },
  });
  const owner = apartment?.owner;
  if (!owner || !isApartmentAccountEmail(owner.email)) return false;
  await db.member.updateMany({ where: { id: owner.id }, data: { role: "admin" } });
  return true;
}

/**
 * Tar bort admin-rätten. Lägenhetens konto blir ett vanligt lägenhetskonto och
 * finns kvar för hushållet. Ett personligt admin-konto tas bort ur föreningen;
 * dess inloggning kan höra till fler föreningar och städas av users:prune.
 */
export async function revokeAdmin(memberId: string): Promise<void> {
  const { db } = await getTenantDb();
  const member = await db.member.findFirst({
    where: { id: memberId, role: "admin" },
    select: { id: true, email: true },
  });
  if (!member) return;

  if (isApartmentAccountEmail(member.email)) {
    await db.member.updateMany({ where: { id: member.id }, data: { role: "member" } });
  } else {
    await db.member.deleteMany({ where: { id: member.id } });
  }
}
