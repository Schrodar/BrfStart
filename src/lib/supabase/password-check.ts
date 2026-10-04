import { createClient } from "@supabase/supabase-js";

/**
 * Kontrollerar att någon känner till lösenordet för ett befintligt konto, utan
 * att logga in dem på sajten: klienten sparar ingen session och sätter inga
 * cookies. Sessionen som skapas avslutas direkt, och bara den – andra
 * inloggningar för samma konto påverkas inte.
 *
 * Används när en registrering gäller en e-postadress som redan har ett konto.
 * Konton är gemensamma för alla föreningar, så den som registrerar sig får bara
 * kopplas till kontot om hen bevisar att det är hens.
 */
export async function knowsPassword(email: string, password: string): Promise<boolean> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) return false;
  await client.auth.signOut({ scope: "local" });
  return true;
}
