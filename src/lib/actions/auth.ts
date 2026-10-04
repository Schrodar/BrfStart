"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getMemberByEmail, registerMember } from "@/lib/data";
import { safeNextPath } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { knowsPassword } from "@/lib/supabase/password-check";
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
  // förenings sida ska få veta det. Admins och boende som läggs upp utan
  // registrering bjuds in (JnM-panelen eller scripts/invite-admin.ts) och
  // skapas först när de har valt lösenord på /aktivera.
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
  if (member.status !== "approved") redirect("/medlem/vantar");
  if (member.role === "admin") redirect(next ?? "/admin");
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

  // Finns e-postadressen redan i föreningen skapas inget konto alls. Annars
  // kunde den som först registrerar en adress som styrelsen redan lagt upp
  // välja lösenordet – och ta över raden, även en admin-rad.
  if (await getMemberByEmail(parsed.data.email)) {
    return {
      error:
        "Den här e-postadressen finns redan i föreningen. Logga in, eller kontakta styrelsen om du inte kommer in.",
    };
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
  let existingAccount = false;
  if (error) {
    const msg = error.message.toLowerCase();
    const alreadyExists =
      msg.includes("registered") ||
      msg.includes("already") ||
      msg.includes("exists");
    if (!alreadyExists) {
      return { error: "Registreringen misslyckades. Försök igen." };
    }
    // Auth är global (delad databas): kontot kan höra till en annan förening –
    // eller ha skapats av någon annan med den här adressen, eftersom e-posten
    // inte bekräftas. Profilen kopplas därför bara till kontot om den som
    // registrerar sig kan dess lösenord. Annars kunde den riktiga personen
    // kopplas till ett konto som någon annan styr.
    if (!(await knowsPassword(parsed.data.email, parsed.data.password))) {
      return {
        error:
          "E-postadressen har redan ett konto hos en förening på plattformen. Registrera dig med samma lösenord som där. Har du inte skapat något konto själv – kontakta styrelsen, så kan de skicka en inbjudan.",
      };
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
      ? "Tack! Din registrering har tagits emot och väntar på godkännande av styrelsen. Du loggar in med samma lösenord som på ditt befintliga konto."
      : "Tack! Din registrering har tagits emot och väntar på godkännande av styrelsen. Du får ett mejl när kontot aktiverats.",
  };
}
