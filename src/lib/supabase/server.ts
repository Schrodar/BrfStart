import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase-klient för Server Components och Server Actions. Läser/skriver
 * sessionen via Next-cookies. I rena Server Components kan cookies inte skrivas
 * – då sköter middleware (src/middleware.ts) uppdateringen istället.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Anropat från en Server Component – ignoreras, middleware uppdaterar.
          }
        },
      },
    },
  );
}
