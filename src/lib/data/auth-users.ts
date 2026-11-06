import { getTenantDb } from "@/lib/tenant";

/**
 * Id för inloggningskontot (Supabase Auth) med den här adressen, om det finns.
 *
 * Rå SQL mot auth-schemat går förbi tenant-extensionen, men auth.users är inte
 * föreningsdata: inloggningskontona är gemensamma för alla föreningar i
 * databasen. Därför jämförs bara e-posten här – vilken förening kontot hör till
 * avgör Member-raden.
 */
export async function findAuthUserId(email: string): Promise<string | null> {
  const { db } = await getTenantDb();
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM auth.users WHERE lower(email) = ${email.toLowerCase()} LIMIT 1`;
  return rows[0]?.id ?? null;
}
