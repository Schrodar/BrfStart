"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getLoginEmailForApartment, getMemberByEmail } from "@/lib/data";
import { safeNextPath } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  success?: string;
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Ange lägenhetsnummer eller e-post."),
  password: z.string().min(1, "Ange ditt lösenord."),
});

/** Samma svar oavsett vad som var fel – annars går det att pröva fram vilka lägenheter som har konto. */
const WRONG_LOGIN = "Fel lägenhetsnummer, e-post eller lösenord.";

/**
 * Boende loggar in med lägenhetsnummer – lägenhetens konto har en intern
 * adress som slås upp här. Styrelsen loggar in med sin e-post.
 *
 * Det finns ingen registrering: lägenhetens konto skapas med koden i brevet
 * (/aktivera), och styrelsens konton bjuds in av JnM.
 */
export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }

  const { identifier, password } = parsed.data;
  const email = identifier.includes("@")
    ? identifier
    : await getLoginEmailForApartment(identifier);
  if (!email) return { error: WRONG_LOGIN };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("not confirmed")) {
      return { error: "E-postadressen är inte bekräftad ännu." };
    }
    return { error: WRONG_LOGIN };
  }

  // Inloggningen är gemensam för alla föreningar i databasen, men profilen hör
  // till EN förening. Den som hamnat på fel förenings sida ska få veta det.
  const member = await getMemberByEmail(email);
  if (!member) {
    await supabase.auth.signOut();
    return {
      error:
        "Det finns inget konto för den här föreningen. Aktivera lägenhetens konto med koden i brevet, eller kontakta styrelsen.",
    };
  }
  // Väntande och spärrade konton finns bara kvar från tiden med registrering.
  if (member.status !== "approved") {
    await supabase.auth.signOut();
    return {
      error:
        "Kontot är inte aktivt. Aktivera lägenhetens konto med koden i brevet, eller kontakta styrelsen.",
    };
  }

  // Den som skickats hit från en skyddad sida ska tillbaka dit efter inloggningen.
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (member.role === "admin") redirect(next ?? "/admin");
  redirect(next ?? "/medlem");
}
