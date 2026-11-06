import { createHash, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getTenantDb } from "@/lib/tenant";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { compareApartmentNumbers } from "@/lib/numbering";
import { releaseApartment } from "./apartments";
import { findAuthUserId } from "./auth-users";

/**
 * =============================================================================
 * LÄGENHETENS KOD OCH KONTO
 * =============================================================================
 * Varje lägenhet har ETT konto, utan namn och utan e-post. Kontot skapas med
 * koden i brevet som delas ut till brevlådan, på /aktivera. Samma kod igen ger
 * kontot en ny inloggning: Supabase-kontot raderas och skapas på nytt, så att
 * varje enhet som var inloggad blir utloggad. Member-raden ligger kvar, med
 * felanmälningar och annonsrätt.
 *
 * Koden sparas bara som sha256, precis som inbjudningslänkarna. Den finns i
 * klartext en enda gång – i breven när den skapas.
 *
 * Flera föreningar delar databasen och Supabase Auth:
 *   - koden slås upp via den tenant-scopade klienten och gäller bara i sin förening
 *   - lägenhetens interna adress bygger på lägenhetens id, som är unikt i hela
 *     databasen, och sparas på Member-raden
 */

/** 31 tecken utan förväxlingsbara: inga 0/O och inga 1/I/L. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 12;
const GROUP_SIZE = 4;

/** .invalid kan aldrig ta emot mejl (RFC 2606) – adressen är bara en inloggningsnyckel. */
export const APARTMENT_ACCOUNT_DOMAIN = "konto.invalid";

export function apartmentAccountEmail(apartmentId: string): string {
  return `lgh-${apartmentId}@${APARTMENT_ACCOUNT_DOMAIN}`;
}

/** Lägenhetens eget konto (inte ett personligt konto med riktig e-post). */
export function isApartmentAccountEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${APARTMENT_ACCOUNT_DOMAIN}`);
}

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Det som skrivs in jämförs utan mellanslag, bindestreck och skiftläge. */
export function normalizeAccessCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** "K7QFM2XP9CRT" → "K7QF-M2XP-9CRT", som i brevet. */
export function formatAccessCode(code: string): string {
  const parts = normalizeAccessCode(code).match(new RegExp(`.{1,${GROUP_SIZE}}`, "g"));
  return parts?.join("-") ?? "";
}

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

type TenantDb = Awaited<ReturnType<typeof getTenantDb>>["db"];

/**
 * Sparar en ny kod på lägenheten och returnerar den i klartext. Den gamla koden
 * slutar gälla direkt. Två lika koder i samma förening är i praktiken omöjligt,
 * men det unika indexet stoppar det ändå – då dras en ny.
 */
async function storeNewCode(db: TenantDb, apartmentId: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const code = generateCode();
    try {
      await db.apartment.updateMany({
        where: { id: apartmentId },
        data: { accessCodeHash: digest(code), accessCodeCreatedAt: new Date() },
      });
      return code;
    } catch (error) {
      const clash =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!clash || attempt >= 4) throw error;
    }
  }
}

/** Ett brev till en brevlåda. */
export interface AccessLetter {
  apartmentId: string;
  number: string;
  standardNumber: string;
  floor: string;
  buildingName: string;
  buildingAddress: string;
  /** Koden i klartext, formaterad. Finns bara i det här svaret – sparas aldrig. */
  code: string;
}

/**
 * Skapar nya koder för lägenheterna och returnerar ett brev per lägenhet, i
 * nummerordning. Kontona påverkas inte: ett befintligt konto får en ny
 * inloggning först när någon använder den nya koden.
 */
export async function createAccessCodes(
  apartmentIds: string[],
): Promise<AccessLetter[]> {
  if (apartmentIds.length === 0) return [];
  const { db } = await getTenantDb();
  const apartments = await db.apartment.findMany({
    where: { id: { in: apartmentIds } },
    select: {
      id: true,
      number: true,
      standardNumber: true,
      floor: true,
      building: { select: { name: true, address: true } },
    },
  });
  apartments.sort((x, y) => compareApartmentNumbers(x.number, y.number));

  const letters: AccessLetter[] = [];
  for (const a of apartments) {
    const code = await storeNewCode(db, a.id);
    letters.push({
      apartmentId: a.id,
      number: a.number,
      standardNumber: a.standardNumber,
      floor: a.floor,
      buildingName: a.building?.name ?? "",
      buildingAddress: a.building?.address ?? "",
      code: formatAccessCode(code),
    });
  }
  return letters;
}

export type RedeemCodeResult =
  | { ok: true; email: string }
  | { ok: false; error: string; wrongCode: boolean };

const WRONG_CODE =
  "Koden stämmer inte. Kontrollera att du har skrivit av den rätt.";
const FAILED = "Kontot kunde inte skapas just nu. Försök igen om en stund.";

/**
 * Löser in lägenhetens kod: skapar lägenhetens konto, eller ger det en ny
 * inloggning om det redan finns. Returnerar adressen att logga in med.
 */
export async function redeemAccessCode(
  code: string,
  password: string,
): Promise<RedeemCodeResult> {
  const normalized = normalizeAccessCode(code);
  if (normalized.length !== CODE_LENGTH) {
    return { ok: false, error: WRONG_CODE, wrongCode: true };
  }

  const { db, associationId } = await getTenantDb();
  const apartment = await db.apartment.findFirst({
    where: { accessCodeHash: digest(normalized) },
    select: {
      id: true,
      number: true,
      owner: { select: { id: true, role: true } },
    },
  });
  if (!apartment) return { ok: false, error: WRONG_CODE, wrongCode: true };

  const email = apartmentAccountEmail(apartment.id);
  const admin = createSupabaseAdminClient();

  // Den gamla inloggningen raderas. Ett raderat konto kan inte förnya sina
  // sessioner, så varje enhet som var inloggad loggas ut.
  const oldAuthId = await findAuthUserId(email);
  if (oldAuthId) {
    const { error } = await admin.auth.admin.deleteUser(oldAuthId);
    if (error) return { ok: false, error: FAILED, wrongCode: false };
  }
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) return { ok: false, error: FAILED, wrongCode: false };

  // Lägenhetens Member-rad. Finns den redan ligger den kvar, med felanmälningar
  // och annonsrätt.
  let member = await db.member.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (!member) {
    member = await db.member.create({
      data: {
        associationId,
        email,
        fullName: `Lägenhet ${apartment.number}`,
        apartment: apartment.number,
        role: "member",
        status: "approved",
      },
      select: { id: true },
    });
  }

  const owner = apartment.owner;
  if (owner?.id !== member.id) {
    // Övergången från registreringen: lägenheten ägdes av ett personligt
    // boendekonto, som lägenhetens konto nu ersätter. Styrelsens personliga
    // konton tas aldrig bort här – de kopplas bara bort från lägenheten.
    if (owner && owner.role !== "admin") {
      await db.member.deleteMany({ where: { id: owner.id } });
    }
    await db.apartment.updateMany({
      where: { id: apartment.id },
      data: { ownerMemberId: member.id },
    });
  }

  return { ok: true, email };
}

/**
 * Adressen att logga in med för ett lägenhetsnummer, eller null om lägenheten
 * saknar eget konto. Bara föreningens egna lägenheter söks, så samma nummer i
 * en annan förening krockar aldrig.
 */
export async function getLoginEmailForApartment(
  number: string,
): Promise<string | null> {
  const value = number.trim();
  if (!value) return null;
  const { db } = await getTenantDb();
  const apartment = await db.apartment.findFirst({
    where: { number: { equals: value, mode: "insensitive" } },
    select: { owner: { select: { email: true } } },
  });
  const email = apartment?.owner?.email;
  // Personliga konton (styrelsen, och boende från tiden med registrering)
  // loggar in med sin e-post – aldrig med lägenhetsnumret.
  return email && isApartmentAccountEmail(email) ? email : null;
}

// ---------------------------------------------------------------------------
// Kontot på lägenheten (adminpanelen)
// ---------------------------------------------------------------------------

export interface ApartmentAccount {
  memberId: string;
  /**
   * apartment = lägenhetens eget konto (skapat med koden).
   * personal  = ett personligt konto: en boende från tiden med registrering,
   *             eller en ledamot som kopplats till lägenheten.
   */
  kind: "apartment" | "personal";
  /** När kontot skapades – för lägenhetens konto när koden användes första gången. */
  activatedAt: string;
  canManageListing: boolean;
}

/** Kontot som hör till lägenheten, eller null om ingen har aktiverat det. */
export async function getApartmentAccount(
  apartmentId: string,
): Promise<ApartmentAccount | null> {
  const { db } = await getTenantDb();
  const apartment = await db.apartment.findFirst({
    where: { id: apartmentId },
    select: {
      owner: {
        select: {
          id: true,
          email: true,
          createdAt: true,
          canManageListing: true,
        },
      },
    },
  });
  const owner = apartment?.owner;
  if (!owner) return null;
  return {
    memberId: owner.id,
    kind: isApartmentAccountEmail(owner.email) ? "apartment" : "personal",
    activatedAt: owner.createdAt.toISOString(),
    canManageListing: owner.canManageListing,
  };
}

/**
 * Raderar lägenhetens konto: inloggningen i Supabase och Member-raden.
 * Felanmälningarna finns kvar för styrelsen men kopplas bort från kontot.
 *
 * Styrelsens personliga konton raderas aldrig här – de kopplas bara bort från
 * lägenheten. Ett personligt boendekonto från tiden med registrering tas bort
 * ur föreningen; dess inloggning kan höra till fler föreningar och städas av
 * `npm run users:prune`.
 */
export async function deleteApartmentAccount(apartmentId: string): Promise<void> {
  const { db } = await getTenantDb();
  const apartment = await db.apartment.findFirst({
    where: { id: apartmentId },
    select: { owner: { select: { id: true, email: true, role: true } } },
  });
  const owner = apartment?.owner;
  if (!owner) return;

  if (owner.role === "admin") {
    await db.apartment.updateMany({
      where: { id: apartmentId },
      data: { ownerMemberId: null },
    });
    return;
  }

  if (isApartmentAccountEmail(owner.email)) {
    const authId = await findAuthUserId(owner.email);
    if (authId) {
      const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(authId);
      if (error) throw new Error(`Inloggningen kunde inte raderas: ${error.message}`);
    }
  }
  await db.member.deleteMany({ where: { id: owner.id } });
}

/** Tar bort lägenhetens kod. Den slutar gälla direkt. */
export async function clearAccessCode(apartmentId: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({
    where: { id: apartmentId },
    data: { accessCodeHash: null, accessCodeCreatedAt: null },
  });
}

/**
 * Ägarbyte: lägenhetens konto raderas så att säljaren loggas ut, annonsen och
 * bilderna rensas och koden slutar gälla. Fakta och planritning ligger kvar
 * till nästa ägare, som får en ny kod i ett nytt brev.
 */
export async function endApartmentOwnership(apartmentId: string): Promise<void> {
  await deleteApartmentAccount(apartmentId);
  await releaseApartment(apartmentId);
  await clearAccessCode(apartmentId);
}

/**
 * Håller lägenhetskontots namn i takt med lägenhetsnumret, när numret ändras i
 * registret. Personliga konton rörs inte.
 */
export async function syncApartmentAccountName(apartmentId: string): Promise<void> {
  const { db } = await getTenantDb();
  const apartment = await db.apartment.findFirst({
    where: { id: apartmentId },
    select: { number: true, owner: { select: { id: true, email: true } } },
  });
  const owner = apartment?.owner;
  if (!apartment || !owner || !isApartmentAccountEmail(owner.email)) return;
  await db.member.updateMany({
    where: { id: owner.id },
    data: { fullName: `Lägenhet ${apartment.number}`, apartment: apartment.number },
  });
}
