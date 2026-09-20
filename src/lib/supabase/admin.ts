import { createClient } from "@supabase/supabase-js";

/**
 * Supabase-klient med service role-nyckel. FÅR ENDAST användas server-side –
 * kringgår RLS och kan hantera auth-användare (skapa/radera). Importera aldrig
 * detta i en klientkomponent.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
