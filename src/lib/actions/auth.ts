"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMemberByEmail, registerMember } from "@/lib/data";
import { safeNextPath } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyNewRegistration } from "@/lib/email";

export interface AuthState {
  error?: string;
  success?: string;
}

const loginSchema = z.object({
  email: z.string().email("Ange en giltig e-postadress."),
  password: z.string().min(1, "Ange ditt lösenord."),
});

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.message.toLowerCase().includes("not confirmed")) {
      return { error: "E-postadressen är inte bekräftad ännu." };
    }
    return { error: "Fel e-post eller lösenord." };
  }

  // Inloggningen är gemensam för alla föreningar (samma Supabase-projekt), men
  // profilen hör till EN förening. Saknas den skapas ingen tyst: styrelsen ska
  // slippa väntande rader de inte känner igen, och den som hamnat på fel
  // förenings sida ska få veta det. Första adminkontot skapas i stället med
  // scripts/promote-admin.ts, som lägger upp medlemsraden själv.
  const member = await getMemberByEmail(parsed.data.email);
  if (!member) {
    await supabase.auth.signOut();
    return {
      error:
        "Det finns inget konto för den här föreningen. Registrera dig, eller kontakta styrelsen om du borde ha tillgång.",
    };
  }
  if (member.status === "rejected") {
    await supabase.auth.signOut();
    return { error: "Kontot är spärrat. Kontakta styrelsen." };
  }

  // Den som skickats hit från en skyddad sida ska tillbaka dit efter
  // inloggningen. Väntande konton går fortfarande till vänteläget.
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (member.role === "admin") redirect(next ?? "/admin");
  if (member.status !== "approved") redirect("/medlem/vantar");
  redirect(next ?? "/medlem");
}

const registerSchema = z.object({
  fullName: z.string().min(2, "Ange ditt namn."),
  email: z.string().email("Ange en giltig e-postadress."),
  apartment: z.string().min(1, "Ange lägenhetsnummer."),
  password: z.string().min(6, "Lösenordet måste vara minst 6 tecken."),
});

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    apartment: formData.get("apartment"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }

  // Skapa auth-användaren via Admin-API med bekräftad e-post. Då krävs ingen
  // e-postbekräftelse – styrelsens godkännande är grinden. Skapar ingen session,
  // så registreringen loggar inte in användaren.
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  // Har adressen redan ett konto behålls det gamla lösenordet. Det måste
  // kvittot säga, annars står personen med ett lösenord som inte fungerar.
  let existingAccount = false;
  if (error) {
    const msg = error.message.toLowerCase();
    const alreadyExists =
      msg.includes("registered") ||
      msg.includes("already") ||
      msg.includes("exists");
    // Auth är global (delad databas). Om personen redan har ett konto (t.ex.
    // medlem i en annan förening) fortsätter vi och skapar bara en Member-profil
    // för DENNA förening – de loggar in med sitt befintliga lösenord.
    if (!alreadyExists) {
      return { error: "Registreringen misslyckades. Försök igen." };
    }
    existingAccount = true;
  }

  // Skapa profilen (status: pending) för denna förening.
  const result = await registerMember({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    apartment: parsed.data.apartment,
  });
  if (!result.ok) {
    return { error: result.error };
  }
  await notifyNewRegistration(result.member);

  return {
    success: existingAccount
      ? "Tack! Din registrering har tagits emot och väntar på godkännande av styrelsen. E-postadressen har redan ett konto sedan tidigare – logga in med det lösenord du använder där. Lösenordet du skrev nu har inte sparats."
      : "Tack! Din registrering har tagits emot och väntar på godkännande av styrelsen. Du får ett mejl när kontot aktiverats.",
  };
}
