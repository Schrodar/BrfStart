"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { redeemInvitation } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ActivateState {
  error?: string;
}

const activateSchema = z
  .object({
    token: z.string().min(1),
    fullName: z.string().trim().min(2, "Ange ditt namn."),
    apartment: z.string().trim().max(50),
    password: z.string().min(8, "Lösenordet måste vara minst 8 tecken."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Lösenorden är inte likadana.",
    path: ["confirm"],
  });

/**
 * Löser in inbjudan och loggar in personen direkt, så att hen hamnar i sin
 * adminpanel eller på Mina sidor utan ett extra inloggningssteg.
 */
export async function activateAction(
  _prev: ActivateState,
  formData: FormData,
): Promise<ActivateState> {
  const parsed = activateSchema.safeParse({
    token: formData.get("token"),
    fullName: formData.get("fullName"),
    apartment: formData.get("apartment") ?? "",
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltiga uppgifter." };
  }

  const { token, fullName, apartment, password } = parsed.data;
  const result = await redeemInvitation(token, { fullName, apartment, password });
  if (!result.ok) return { error: result.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.email,
    password,
  });
  // Kontot är klart även om inloggningen av någon anledning inte gick – då får
  // personen logga in själv med lösenordet hen just valde.
  if (error) redirect("/logga-in");

  redirect(result.role === "admin" ? "/admin" : "/medlem");
}
