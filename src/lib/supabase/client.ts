import { createBrowserClient } from "@supabase/ssr";

/** Supabase-klient för klientkomponenter (används vid behov, t.ex. realtid). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
