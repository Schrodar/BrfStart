"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getActivation, redeemAccessCode, redeemInvitation } from "@/lib/data";
import { clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ActivateState {
  error?: string;
}

const baseSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().trim().min(2, "Ange ditt namn."),
  apartment: z.string().trim().max(50),
});

const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Lösenordet måste vara minst 8 tecken."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Lösenorden är inte likadana.",
    path: ["confirm"],
  });

const existingPasswordSchema = z.object({
  password: z.string().min(1, "Skriv lösenordet till ditt befintliga konto."),
});

const INVALID = "Länken är ogiltig eller har gått ut. Be om en ny inbjudan.";

/**
 * Löser in inbjudan och loggar in personen direkt, så att hen hamnar i sin
 * adminpanel eller på Mina sidor utan ett extra inloggningssteg.
 *
 * Vilket lösenord som krävs avgörs här på servern igen – aldrig av formuläret.
 */
export async function activateAction(
  _prev: ActivateState,
  formData: FormData,
): Promise<ActivateState> {
  const base = baseSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    apartment: formData.get("apartment") ?? "",
  });
  if (!base.success) {
    return { error: base.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }

  const activation = await getActivation(base.data.token);
  if (!activation) return { error: INVALID };

  const passwordInput = {
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  };
  const parsedPassword =
    activation.mode === "verify"
      ? existingPasswordSchema.safeParse(passwordInput)
      : newPasswordSchema.safeParse(passwordInput);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? "Ogiltigt lösenord." };
  }
  const { password } = parsedPassword.data;

  const { token, fullName, apartment } = base.data;
  const result = await redeemInvitation(token, { fullName, apartment, password });
  if (!result.ok) return { error: result.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.email,
    password,
  });
  // Kontot är klart även om inloggningen av någon anledning inte gick – då får
  // personen logga in själv med lösenordet.
  if (error) redirect("/logga-in");

  redirect(result.role === "admin" ? "/admin" : "/medlem");
}

// ---------------------------------------------------------------------------
// Lägenhetens kod (brevet i brevlådan)
// ---------------------------------------------------------------------------

const codeSchema = z
  .object({
    code: z.string().trim().min(1, "Skriv koden från brevet."),
    password: z.string().min(8, "Lösenordet måste vara minst 8 tecken."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Lösenorden är inte likadana.",
    path: ["confirm"],
  });

/** Högst tio felaktiga koder per IP och kvart – koden går inte att pröva fram. */
const CODE_ATTEMPTS = 10;
const CODE_WINDOW_MS = 15 * 60_000;

/**
 * Skapar lägenhetens konto med koden, eller ger det en ny inloggning om det
 * redan finns, och loggar in direkt till Mina sidor.
 */
export async function activateWithCodeAction(
  _prev: ActivateState,
  formData: FormData,
): Promise<ActivateState> {
  const parsed = codeSchema.safeParse({
    code: formData.get("code"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Kontrollera formuläret." };
  }

  const key = `kod:${await clientIp()}`;
  if (isRateLimited(key, CODE_ATTEMPTS, CODE_WINDOW_MS)) {
    return { error: "För många försök. Vänta en kvart och försök igen." };
  }

  const { code, password } = parsed.data;
  const result = await redeemAccessCode(code, password);
  if (!result.ok) {
    if (result.wrongCode) recordFailure(key, CODE_WINDOW_MS);
    return { error: result.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.email,
    password,
  });
  // Kontot är klart även om inloggningen inte gick – då loggar man in själv.
  if (error) redirect("/logga-in");

  redirect("/medlem");
}
