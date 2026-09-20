import type { MaintenanceStatus } from "@/lib/types";

/**
 * Felanmälans statusar, i den ordning ett ärende går igenom dem.
 *
 * Samma ord för styrelsen i admin och för medlemmen på Mina sidor – annars
 * pratar de förbi varandra när medlemmen hör av sig om sitt ärende.
 *
 * Egen modul utan serverberoenden: klientkomponenter och e-postmodulen
 * importerar härifrån, inte från datalagret (som drar med sig Prisma).
 */
export const MAINTENANCE_STATUSES: { value: MaintenanceStatus; label: string }[] =
  [
    { value: "ny", label: "Inskickat" },
    { value: "pagar", label: "Behandlat av styrelsen" },
    { value: "atgardad", label: "Åtgärdat" },
  ];

export function maintenanceStatusLabel(status: MaintenanceStatus): string {
  return MAINTENANCE_STATUSES.find((s) => s.value === status)?.label ?? status;
}

/** Färg på statusmärket. */
export const MAINTENANCE_STATUS_TONE = {
  ny: "warning",
  pagar: "brand",
  atgardad: "success",
} as const satisfies Record<MaintenanceStatus, string>;

/**
 * Ett ärende är aktivt tills styrelsen markerat det som åtgärdat – samma regel
 * som styrelsens räknare över öppna ärenden.
 */
export function isActiveMaintenanceStatus(status: MaintenanceStatus): boolean {
  return status !== "atgardad";
}

/**
 * Har statusen ändrats sedan medlemmen senast tittade?
 *
 * Saknas `seenAt` (ärenden skapade innan markeringen fanns) räknas skapandet
 * som sett – medlemmen vet ju att hen skickade in ärendet.
 */
export function hasStatusUpdate(
  lastStatusChangeAt: Date | string | null,
  seenAt: Date | string | null,
  createdAt: Date | string,
): boolean {
  if (!lastStatusChangeAt) return false;
  return (
    new Date(lastStatusChangeAt).getTime() >
    new Date(seenAt ?? createdAt).getTime()
  );
}
