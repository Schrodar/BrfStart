/**
 * =============================================================================
 * E-POST (stub)
 * =============================================================================
 * Loggar utgående mejl till konsolen istället för att skicka. Byt innanmätet i
 * sendEmail() mot Resend när backend kopplas in (RESEND_API_KEY finns redan i
 * .env.example). Anropsställena behöver inte ändras.
 */

import { siteConfig } from "@/config/siteConfig";
import { getAssociationProfile } from "@/lib/data";
import { maintenanceStatusLabel } from "@/lib/maintenance-status";
import type { MaintenanceStatus } from "@/lib/types";
import { shortNameOf } from "@/lib/utils";

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

/** Aviserar styrelsen om en ny medlemsregistrering som väntar godkännande. */
export async function notifyNewRegistration(member: {
  fullName: string;
  email: string;
  apartment: string;
}): Promise<void> {
  await sendEmail({
    to: await adminEmail(),
    subject: "Ny medlem väntar på godkännande",
    body: `${member.fullName} (lgh ${member.apartment}, ${member.email}) har registrerat sig och väntar på godkännande i adminpanelen.`,
  });
}

/** Bekräftar för medlemmen att kontot godkänts. */
export async function notifyMemberApproved(member: {
  fullName: string;
  email: string;
}): Promise<void> {
  const association = await getAssociationProfile();
  await sendEmail({
    to: member.email,
    subject: `Ditt konto hos ${shortNameOf(association)} är godkänt`,
    body: `Hej ${member.fullName}!\n\nDitt konto är nu godkänt av styrelsen. Du kan logga in och nå medlemssidorna, dina lägenhetsuppgifter och interna dokument.`,
  });
}

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || siteConfig.seo.siteUrl
).replace(/\/$/, "");

/** Första stycket i mejlet – vad statusen betyder för medlemmen. */
const statusLead: Record<MaintenanceStatus, string> = {
  ny: "Din felanmälan har fått status Inskickat igen och väntar på att styrelsen tittar på den.",
  pagar:
    "Styrelsen har behandlat din felanmälan och arbetar nu med att få felet åtgärdat.",
  atgardad: "Felet är åtgärdat. Tack för att du anmälde det!",
};

/** Aviserar medlemmen när styrelsen ändrat status på hens felanmälan. */
export async function notifyMaintenanceStatusChanged(update: {
  to: string;
  name: string;
  category: string;
  location: string;
  status: MaintenanceStatus;
}): Promise<void> {
  const label = maintenanceStatusLabel(update.status);
  await sendEmail({
    to: update.to,
    subject: `Din felanmälan: ${label}`,
    body: `Hej ${update.name}!

${statusLead[update.status]}

Ärende: ${update.category} – ${update.location}
Status: ${label}

Du kan följa dina felanmälningar under Mina sidor:
${siteUrl}/medlem/felanmalningar`,
  });
}
