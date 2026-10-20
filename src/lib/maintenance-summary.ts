import type { MaintenanceRequest } from "@/lib/types";
import {
  maintenanceNumberLabel,
  maintenanceStatusLabel,
} from "@/lib/maintenance-status";

/**
 * Protokolltext för felanmälningar – det sekreteraren klistrar in i
 * mötesprotokollet. Ren funktion utan serverberoenden: ärendemodalen och
 * mötesläget kör den i webbläsaren när någon klickar på Kopiera.
 *
 * Med i texten: vad felet är, nuvarande status och vem som utför jobbet,
 * styrelsens beslut och svar till medlemmen, och när ärendet följs upp.
 * Interna noteringar hålls utanför – de är arbetsanteckningar, inte beslut.
 */

const day = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-11-15" – kort och entydigt i ett protokoll. */
function isoDay(iso: string): string {
  return day.format(new Date(iso));
}

/** Första stycket i beskrivningen, avkortat – protokollet ska inte bli en kopia av anmälan. */
function shortDescription(text: string, max = 200): string {
  const first = text.trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ");
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

export interface SummaryOptions {
  /**
   * Ta bara med beslut, svar och statusändringar från och med den här tiden
   * (t.ex. dagens möte). Utelämnad = hela historiken.
   */
  since?: Date;
}

/** Ett ärende som ett stycke i protokollet. */
export function formatMaintenanceSummary(
  request: MaintenanceRequest,
  options: SummaryOptions = {},
): string {
  const since = options.since?.getTime() ?? 0;
  const events = request.events.filter(
    (e) => new Date(e.createdAt).getTime() >= since,
  );

  const heading = [
    maintenanceNumberLabel(request.number),
    `${request.categoryName} – ${request.location}`,
  ]
    .filter(Boolean)
    .join(" ");

  const lines = [
    `${heading} (anmäld ${isoDay(request.createdAt)})`,
    `Felet: ${shortDescription(request.description)}`,
  ];

  const status = [`Status: ${maintenanceStatusLabel(request.status)}.`];
  if (request.assignedTo) status.push(`Utförs av: ${request.assignedTo}.`);
  lines.push(status.join(" "));

  for (const e of events) {
    if (!e.body) continue;
    if (e.kind === "decision") lines.push(`Beslut (${isoDay(e.createdAt)}): ${e.body}`);
    if (e.kind === "reply") lines.push(`Svar till medlemmen (${isoDay(e.createdAt)}): ${e.body}`);
  }

  return lines.join("\n");
}

/** Flera ärenden under en gemensam rubrik, med en tom rad mellan dem. */
export function formatMaintenanceProtocol(
  requests: MaintenanceRequest[],
  options: SummaryOptions = {},
): string {
  if (requests.length === 0) return "";
  return [
    "Felanmälningar",
    ...requests.map((r) => formatMaintenanceSummary(r, options)),
  ].join("\n\n");
}
