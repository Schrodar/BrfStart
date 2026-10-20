"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createMaintenanceRequest } from "@/lib/data";
import { notifyMaintenance } from "@/lib/email";
import { HONEYPOT_FIELD } from "@/lib/form";

export interface MaintenanceState {
  error?: string;
  success?: string;
}

/**
 * Namnet är frivilligt, men styrelsen måste kunna svara anmälaren – och svaret
 * går med e-post, så e-posten krävs. Telefon frågas inte längre efter; kolumnen
 * finns kvar för äldre ärenden.
 */
const schema = z.object({
  name: z.string().default(""),
  email: z
    .string()
    .trim()
    .min(1, "Fyll i din e-post så att styrelsen kan svara dig.")
    .email("Ange en giltig e-postadress."),
  categoryId: z.string().min(1, "Välj en kategori."),
  location: z.string().min(2, "Ange var felet finns."),
  description: z.string().min(5, "Beskriv felet lite mer utförligt."),
});

const SUCCESS =
  "Tack! Din felanmälan har skickats till styrelsen. Vi återkommer om vi behöver mer information.";

export async function submitMaintenance(
  _prev: MaintenanceState,
  formData: FormData,
): Promise<MaintenanceState> {
  const user = await getCurrentUser();

  // Honeypot: bottar fyller i alla fält, även det osynliga. De får samma kvitto
  // som en människa – ett felmeddelande skulle bara lära dem att hoppa över
  // fältet. Inloggade släpps alltid igenom: de är inga bottar, och en
  // lösenordshanterare som fyller i allt får inte tyst svälja en riktig anmälan.
  if (!user && String(formData.get(HONEYPOT_FIELD) ?? "") !== "") {
    return { success: SUCCESS };
  }

  const parsed = schema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    categoryId: formData.get("categoryId"),
    location: formData.get("location"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Kontrollera formuläret.",
    };
  }

  // En inloggad anmälare kopplas till ärendet, så att det syns på Mina sidor
  // och medlemmen kan aviseras. Kopplingen tas från sessionen – ett dolt fält
  // i formuläret skulle låta vem som helst lägga ärenden på någon annan.
  const result = await createMaintenanceRequest({
    ...parsed.data,
    phone: "",
    memberId: user?.id ?? null,
  });
  if (!result.ok) return { error: result.error };

  await notifyMaintenance({
    category: result.request.categoryName,
    location: result.request.location,
    name: result.request.name || "Anonym anmälare",
  });

  // Numret gör det lätt att hänvisa till ärendet. Inloggade kan dessutom följa
  // det och läsa styrelsens svar på Mina sidor.
  const number = result.request.number;
  const reference = number != null ? ` Ärendenummer: #${number}.` : "";
  const follow = user
    ? " Du kan följa ärendet och läsa styrelsens svar under Mina sidor."
    : "";
  return { success: `${SUCCESS}${reference}${follow}` };
}
