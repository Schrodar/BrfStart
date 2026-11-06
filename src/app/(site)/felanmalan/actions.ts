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

/** Det som alltid krävs: vad som är fel och var. */
const issueSchema = z.object({
  categoryId: z.string().min(1, "Välj en kategori."),
  location: z.string().min(2, "Ange var felet finns."),
  description: z.string().min(5, "Beskriv felet lite mer utförligt."),
});

/**
 * Utloggad anmälare: namnet är frivilligt, men styrelsen måste kunna svara –
 * och svaret går med e-post, så e-posten krävs. Telefon frågas inte längre
 * efter; kolumnen finns kvar för äldre ärenden.
 */
const guestSchema = issueSchema.extend({
  name: z.string().default(""),
  email: z
    .string()
    .trim()
    .min(1, "Fyll i din e-post så att styrelsen kan svara dig.")
    .email("Ange en giltig e-postadress."),
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

  const issue = {
    categoryId: formData.get("categoryId"),
    location: formData.get("location"),
    description: formData.get("description"),
  };
  // Inloggad behövs varken namn eller e-post: ärendet kopplas till kontot och
  // styrelsen svarar på Mina sidor. Lägenhetens konto har inget namn och ingen
  // riktig e-post; en ledamots konto har båda.
  const parsed = user
    ? issueSchema.safeParse(issue)
    : guestSchema.safeParse({
        ...issue,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
      });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Kontrollera formuläret.",
    };
  }

  // Lägenhetens konto har ingen e-post. Lägenheten sparas som namn på ärendet,
  // så att styrelsen ser varifrån det kom även efter ett ägarbyte, då kontot
  // raderas och kopplingen till ärendet försvinner.
  const contact = user
    ? user.apartmentNumber
      ? { name: `Lägenhet ${user.apartmentNumber}`, email: "" }
      : { name: user.fullName, email: user.email }
    : { name: "", email: "", ...parsed.data };

  // Kopplingen till kontot tas från sessionen – ett dolt fält i formuläret
  // skulle låta vem som helst lägga ärenden på någon annan.
  const result = await createMaintenanceRequest({
    categoryId: parsed.data.categoryId,
    location: parsed.data.location,
    description: parsed.data.description,
    name: contact.name,
    email: contact.email,
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
    ? " Ni följer ärendet och läser styrelsens svar under Mina sidor."
    : "";
  return { success: `${SUCCESS}${reference}${follow}` };
}
