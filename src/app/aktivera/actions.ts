"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getActivation, redeemInvitation } from "@/lib/data";
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
