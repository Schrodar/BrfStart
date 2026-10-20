import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * =============================================================================
 * SUPPORTLOGG
 * =============================================================================
 * Allt plattformsadmin ändrar under ett supportläge skrivs som en rad i
 * AuditEvent (action "support.change", target = sessionens id). Styrelsen läser
 * raderna under Admin → Supportlogg, och JohanIt-panelen visar dem i sin
 * händelselista.
 *
 * Loggningen sker i tenant-klienten (src/lib/tenant.ts), så varje skrivning
 * kommer med utan att någon action behöver komma ihåg det. Att det är support
 * som skriver vet vi från requireAdmin(): den markerar requesten via
 * markSupportRequest() när den släpper in ett supportläge. Ingen cookie läses
 * här – en vanlig styrelseinloggning i samma webbläsare loggas därför inte.
 *
 * Bas-`prisma` används med flit: loggraden och förhämtningen får inte gå genom
 * tenant-klienten, då skulle loggningen logga sig själv. associationId sätts
 * explicit i varje anrop.
 */

export interface SupportActor {
  sessionId: string;
  platformAdminId: string;
  adminEmail: string;
}

interface RequestState {
  actor: SupportActor | null;
  /** Redan loggade ändringar i den här requesten – en omsortering blir en rad. */
  seen: Set<string>;
}

/** Per request i Next; utanför en request (skript) en ny tom tillstånd varje gång. */
const requestState = cache((): RequestState => ({ actor: null, seen: new Set() }));

/** Anropas av requireAdmin() när requesten körs i ett supportläge. */
export function markSupportRequest(actor: SupportActor): void {
  requestState().actor = actor;
}

/** Pågående supportläge i requesten, annars null. Billigt – ingen databasfråga. */
export function currentSupportActor(): SupportActor | null {
  return requestState().actor;
}

/** Vad en tabell heter för styrelsen, och vilket fält som namnger raden. */
const MODELS: Record<string, { label: string; nameField?: string }> = {
  Association: { label: "föreningens namn och kontaktuppgifter" },
  Member: { label: "medlem", nameField: "fullName" },
  MemberInvitation: { label: "inbjudan", nameField: "fullName" },
  NewsPost: { label: "nyhet", nameField: "title" },
  BoardGroup: { label: "grupp på styrelsesidan", nameField: "name" },
  BoardMember: { label: "person på styrelsesidan", nameField: "name" },
  Document: { label: "dokument", nameField: "title" },
  MaintenanceCategory: { label: "felanmälningskategori", nameField: "name" },
  MaintenanceSettings: { label: "texter på felanmälningssidan" },
  MaintenanceRequest: { label: "felanmälan", nameField: "location" },
  Building: { label: "hus", nameField: "name" },
  Apartment: { label: "lägenhet", nameField: "number" },
  ApartmentPhoto: { label: "lägenhetsbild" },
  SiteContent: { label: "sidinnehåll" },
  AssociationInfo: { label: "föreningsfakta" },
  EconomyFigures: { label: "ekonomiska nyckeltal" },
  Display: { label: "trapphustavla", nameField: "name" },
  Notice: { label: "anslag", nameField: "title" },
  DisplaySettings: { label: "tavlornas inställningar" },
};

const VERBS: Record<string, string> = {
  create: "Skapade",
  createMany: "Skapade",
  update: "Ändrade",
  updateMany: "Ändrade",
  upsert: "Ändrade",
  delete: "Tog bort",
  deleteMany: "Tog bort",
};

/** Operationer som slår upp en rad med where – raden hämtas före skrivningen. */
const LOOKUP_OPS = new Set(["update", "updateMany", "delete", "deleteMany"]);

/**
 * Fält som skrivs i bakgrunden och inte är en ändring någon gjort: när en
 * skärm senast hörde av sig, när en medlem senast tittade på sina ärenden.
 */
const TECHNICAL_FIELDS = new Set(["lastSeenAt", "memberSeenAt"]);

type Row = Record<string, unknown> | null;

/** Ska skrivningen loggas över huvud taget? */
export function isLoggedWrite(model: string, operation: string, args: unknown): boolean {
  if (!MODELS[model] || !VERBS[operation]) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (args as any)?.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const keys = Object.keys(data);
    if (keys.length > 0 && keys.every((k) => TECHNICAL_FIELDS.has(k))) return false;
  }
  return true;
}

/** Raden som skrivningen gäller, hämtad före queryn – annars vet vi inte vad som togs bort. */
export async function fetchRowBefore(
  model: string,
  operation: string,
  args: unknown,
  associationId: string,
): Promise<Row> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const id = (args as any)?.where?.id;
  if (!LOOKUP_OPS.has(operation) || typeof id !== "string") return null;
  try {
    const delegate = modelDelegate(model);
    const where = model === "Association" ? { id } : { id, associationId };
    return (await delegate?.findFirst({ where })) ?? null;
  } catch {
    return null;
  }
}

/**
 * Skriver loggraden. Misslyckas den får det aldrig stoppa styrelsens sparning –
 * felet hamnar bara i serverloggen.
 */
export async function recordSupportChange(input: {
  actor: SupportActor;
  associationId: string;
  model: string;
  operation: string;
  before: Row;
  result: unknown;
}): Promise<void> {
  try {
    const { actor, associationId, model, operation, before, result } = input;
    const count = (result as { count?: unknown } | null)?.count;
    if (typeof count === "number" && count === 0) return;

    const row: Row =
      result && typeof result === "object" && "id" in result
        ? (result as Record<string, unknown>)
        : before;
    const rowId = typeof row?.id === "string" ? row.id : "";

    const verb = VERBS[operation];
    const key = `${model}:${verb}:${rowId}`;
    const state = requestState();
    if (state.seen.has(key)) return;
    state.seen.add(key);

    await prisma.auditEvent.create({
      data: {
        platformAdminId: actor.platformAdminId,
        actorEmail: actor.adminEmail,
        associationId,
        action: "support.change",
        target: actor.sessionId,
        summary: describe(model, verb, row),
      },
    });
  } catch (error) {
    console.error("Kunde inte skriva supportloggen:", error);
  }
}

/** "Ändrade nyhet ”Vårstädning”" – eller bara "Ändrade föreningsfakta". */
function describe(model: string, verb: string, row: Row): string {
  const { label, nameField } = MODELS[model];
  const raw = nameField ? row?.[nameField] : undefined;
  const name = typeof raw === "string" ? raw.trim() : "";
  return name ? `${verb} ${label} ”${name}”` : `${verb} ${label}`;
}

function modelDelegate(model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  return (prisma as unknown as Record<string, { findFirst(args: unknown): Promise<Row> } | undefined>)[key];
}
