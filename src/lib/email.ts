/**
 * =============================================================================
 * E-POST (stub)
 * =============================================================================
 * Loggar utgående mejl till konsolen istället för att skicka. Byt innanmätet i
 * sendEmail() mot Resend när backend kopplas in (RESEND_API_KEY finns redan i
 * .env.example). Anropsställena behöver inte ändras.
 *
 * De boende har lägenhetens konto utan e-post, så sajten mejlar aldrig dem:
 * styrelsens svar och nya statusar syns på Mina sidor. Det enda mejlet går
 * till styrelsen, när en felanmälan kommer in.
 */

import { getAssociationProfile } from "@/lib/data";

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  // Föreningen kan sakna publik e-post – då finns ingen att avisera.
  if (!message.to) {
    console.warn(`[e-post-stub] Ingen mottagare för "${message.subject}".`);
    return;
  }
  // TODO(backend): ersätt med Resend, t.ex.
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   await resend.emails.send({ from: process.env.EMAIL_FROM, ...message });
  console.info(
    `[e-post-stub] Till: ${message.to}\nÄmne: ${message.subject}\n${message.body}\n`,
  );
}

/** Styrelsens adress för aviseringar: env-variabeln, annars föreningens publika e-post. */
async function adminEmail(): Promise<string> {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    (await getAssociationProfile()).contactEmail
  );
}

/** Aviserar styrelsen om en ny felanmälan. */
export async function notifyMaintenance(summary: {
  category: string;
  location: string;
  name: string;
}): Promise<void> {
  await sendEmail({
    to: await adminEmail(),
    subject: `Ny felanmälan: ${summary.category}`,
    body: `En ny felanmälan har inkommit.\nPlats: ${summary.location}\nAnmäld av: ${summary.name}\n\nLogga in i adminpanelen för att hantera ärendet.`,
  });
}
