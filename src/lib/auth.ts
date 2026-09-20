/**
 * =============================================================================
 * AUTENTISERING (Supabase Auth)
 * =============================================================================
 * Sessionen hanteras av Supabase Auth via @supabase/ssr (cookies refreshas i
 * src/middleware.ts). Profilen – roll och godkännandestatus – ligger i vår egen
 * Member-tabell och kopplas till auth-användaren via e-postadressen.
 *
 * getCurrentUser() cachas per request (React cache) så att den bara gör ett
 * getUser()-anrop även om flera guards körs på samma sida.
 */

import { cache } from "react";
import { redirect } from "next/navigation";
import type { CurrentUser } from "@/lib/types";
import { getMemberByEmail } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Inloggad användare (Supabase-session + Member-profil). Null om utloggad. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email;
  if (!email) return null;

  const member = await getMemberByEmail(email);
  if (!member) return null;

  return {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    apartment: member.apartment,
    role: member.role,
    status: member.status,
    canManageListing: member.canManageListing,
  };
});

/** Kräver inloggning. Omdirigerar annars till inloggningssidan. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in");
  return user;
}

/** Kräver admin-roll (styrelsen). */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in?next=/admin");
  if (user.role !== "admin") redirect("/medlem");
  return user;
}

/**
 * Kräver godkänd medlem (admin släpps alltid igenom). Väntande konton skickas
 * till en informationssida.
 */
export async function requireApprovedMember(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/logga-in?next=/medlem");
  if (user.role !== "admin" && user.status !== "approved") {
    redirect("/medlem/vantar");
  }
  return user;
}
