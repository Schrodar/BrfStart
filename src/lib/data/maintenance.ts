import { Prisma } from "@prisma/client";
import type {
  MaintenanceCategory as DbCategory,
  MaintenanceEvent as DbEvent,
  MaintenanceRequest as DbMaintenance,
  MaintenanceSettings as DbSettings,
} from "@prisma/client";
import type {
  MaintenanceCategory,
  MaintenanceCategoryOption,
  MaintenanceEvent,
  MaintenanceEventKind,
  MaintenanceRequest,
  MaintenanceSettings,
  MaintenanceStatus,
  MemberMaintenanceMessage,
  MemberMaintenanceRequest,
  MemberMaintenanceSummary,
} from "@/lib/types";
import { getTenantDb } from "@/lib/tenant";
import {
  hasStatusUpdate,
  isActiveMaintenanceStatus,
} from "@/lib/maintenance-status";

// Etiketterna bor i en modul utan serverberoenden; exporteras vidare härifrån
// så att befintliga importer fortsätter fungera.
export {
  MAINTENANCE_STATUSES,
  maintenanceStatusLabel,
} from "@/lib/maintenance-status";

/** Kategorierna en ny förening startar med. Går att ändra i admin efteråt. */
export const DEFAULT_MAINTENANCE_CATEGORIES = [
  "VVS / vatten",
  "El / belysning",
  "Hiss",
  "Tvättstuga",
  "Utomhus / gård",
  "Övrigt",
];

/**
 * Startvärden för felanmälningssidan.
 *
 * Telefonnumren lämnas TOMMA med flit: tomt nummer döljer rutan, och ett
 * ärvt platshållarnummer (siteConfig har 020-00 00 00 i mallen) skulle
 * publiceras som föreningens jour. Texterna står kvar eftersom de är allmänna
 * formuleringar om ansvarsgränsen, inte påståenden om en viss fastighet.
 */
export const DEFAULT_MAINTENANCE_SETTINGS: MaintenanceSettings = {
  introText:
    "Felanmälan gäller fastigheten och de gemensamma utrymmena – det som föreningen ansvarar för. Fel inne i din egen lägenhet ansvarar du som boende för själv, till exempel egna vitvaror, ytskikt och inredning.",
  emergencyPhone: "",
  emergencyText: "",
  caretakerName: "",
  caretakerPhone: "",
  caretakerText:
    "Fastighetsskötaren är en upphandlad tjänst utanför styrelsen. Beställer du arbete som rör din egen lägenhet betalar du det själv.",
};

function toCategory(c: DbCategory): MaintenanceCategory {
  return {
    id: c.id,
    name: c.name,
    order: c.sortOrder,
    contractorName: c.contractorName,
    contractorPhone: c.contractorPhone,
    contractorEmail: c.contractorEmail,
    contractorInfo: c.contractorInfo,
  };
}

/** Underleverantörsuppgifterna. Tomma strängar = inget att visa. */
export interface ContractorInput {
  contractorName: string;
  contractorPhone: string;
  contractorEmail: string;
  contractorInfo: string;
}

function toSettings(s: DbSettings): MaintenanceSettings {
  return {
    introText: s.introText,
    emergencyPhone: s.emergencyPhone,
    emergencyText: s.emergencyText,
    caretakerName: s.caretakerName,
    caretakerPhone: s.caretakerPhone,
    caretakerText: s.caretakerText,
  };
}

function toEvent(e: DbEvent): MaintenanceEvent {
  return {
    id: e.id,
    body: e.body,
    kind: e.kind,
    visibleToMember: e.visibleToMember,
    statusFrom: e.statusFrom,
    statusTo: e.statusTo,
    author: e.author,
    createdAt: e.createdAt.toISOString(),
  };
}

function toRequest(
  r: DbMaintenance & { category: DbCategory | null; events?: DbEvent[] },
): MaintenanceRequest {
  return {
    id: r.id,
    number: r.number,
    name: r.name,
    email: r.email,
    phone: r.phone,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? "Okänd kategori",
    assignedTo: r.assignedTo,
    memberId: r.memberId,
    events: (r.events ?? []).map(toEvent),
    location: r.location,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Kategorier
// ---------------------------------------------------------------------------

/**
 * Kategorierna för den publika rullgardinen. Hämtar MEDVETET bara id, namn och
 * ordning – underleverantörens kontaktuppgifter får inte följa med ut i sidans
 * payload. Admin använder getMaintenanceCategoriesWithCounts() i stället.
 */
export async function getMaintenanceCategories(): Promise<
  MaintenanceCategoryOption[]
> {
  const { db } = await getTenantDb();
  const rows = await db.maintenanceCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
  return rows.map((c) => ({ id: c.id, name: c.name, order: c.sortOrder }));
}

/** Kategorierna med antal ärenden – underlaget för adminlistan. */
export async function getMaintenanceCategoriesWithCounts(): Promise<
  (MaintenanceCategory & { requestCount: number })[]
> {
  const { db } = await getTenantDb();
  const rows = await db.maintenanceCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { requests: true } } },
  });
  return rows.map((c) => ({
    ...toCategory(c),
    requestCount: c._count.requests,
  }));
}

export type CategoryResult =
  | { ok: true; category: MaintenanceCategory }
  | { ok: false; error: string };

export async function createMaintenanceCategory(
  name: string,
): Promise<CategoryResult> {
  const { db, associationId } = await getTenantDb();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ange ett namn på kategorin." };

  const existing = await db.maintenanceCategory.findFirst({
    where: { name: trimmed },
  });
  if (existing) return { ok: false, error: `"${trimmed}" finns redan.` };

  const last = await db.maintenanceCategory.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const row = await db.maintenanceCategory.create({
    data: {
      associationId,
      name: trimmed,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
  return { ok: true, category: toCategory(row) };
}

export async function updateMaintenanceCategory(
  id: string,
  name: string,
  contractor?: ContractorInput,
): Promise<CategoryResult> {
  const { db } = await getTenantDb();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Ange ett namn på kategorin." };

  const clash = await db.maintenanceCategory.findFirst({
    where: { name: trimmed, NOT: { id } },
  });
  if (clash) return { ok: false, error: `"${trimmed}" finns redan.` };

  await db.maintenanceCategory.updateMany({
    where: { id },
    data: {
      name: trimmed,
      ...(contractor
        ? {
            contractorName: contractor.contractorName.trim(),
            contractorPhone: contractor.contractorPhone.trim(),
            contractorEmail: contractor.contractorEmail.trim(),
            contractorInfo: contractor.contractorInfo.trim(),
          }
        : {}),
    },
  });
  const row = await db.maintenanceCategory.findFirst({ where: { id } });
  if (!row) return { ok: false, error: "Kategorin hittades inte." };
  return { ok: true, category: toCategory(row) };
}

/**
 * Tar bort en oanvänd kategori. Kategorier med ärenden i vägrar vi radera:
 * till skillnad från ett hus finns ingen naturlig plats att flytta ärendena
 * till, och ett ärende utan kategori går varken att sortera eller filtrera på.
 */
export async function deleteMaintenanceCategory(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db } = await getTenantDb();
  const category = await db.maintenanceCategory.findFirst({ where: { id } });
  if (!category) return { ok: false, error: "Kategorin hittades inte." };

  const count = await db.maintenanceRequest.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: `"${category.name}" används av ${count} ${
        count === 1 ? "ärende" : "ärenden"
      }. Byt kategori på dem först.`,
    };
  }

  await db.maintenanceCategory.deleteMany({ where: { id } });
  return { ok: true };
}

export async function reorderMaintenanceCategories(
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { db } = await getTenantDb();
  const own = await db.maintenanceCategory.findMany({ select: { id: true } });
  const ownIds = new Set(own.map((c) => c.id));

  const ids = orderedIds.filter((id) => ownIds.has(id));
  if (ids.length !== ownIds.size) {
    return {
      ok: false,
      error: "Ordningen matchar inte kategorierna. Ladda om sidan.",
    };
  }
  await Promise.all(
    ids.map((id, i) =>
      db.maintenanceCategory.updateMany({
        where: { id },
        data: { sortOrder: i + 1 },
      }),
    ),
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Inställningar
// ---------------------------------------------------------------------------

/** Saknas raden används standardvärdena – sidan ska fungera direkt. */
export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const { db } = await getTenantDb();
  const row = await db.maintenanceSettings.findFirst();
  return row ? toSettings(row) : DEFAULT_MAINTENANCE_SETTINGS;
}

export async function updateMaintenanceSettings(
  input: MaintenanceSettings,
): Promise<MaintenanceSettings> {
  const { db, associationId } = await getTenantDb();
  const data = {
    introText: input.introText.trim(),
    emergencyPhone: input.emergencyPhone.trim(),
    emergencyText: input.emergencyText.trim(),
    caretakerName: input.caretakerName.trim(),
    caretakerPhone: input.caretakerPhone.trim(),
    caretakerText: input.caretakerText.trim(),
  };
  const existing = await db.maintenanceSettings.findFirst({
    select: { id: true },
  });
  if (existing) {
    await db.maintenanceSettings.updateMany({
      where: { id: existing.id },
      data,
    });
  } else {
    await db.maintenanceSettings.create({ data: { associationId, ...data } });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Ärenden
// ---------------------------------------------------------------------------

export async function getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const { db } = await getTenantDb();
  const rows = await db.maintenanceRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  return rows.map(toRequest);
}

export interface MaintenanceInput {
  name: string;
  email: string;
  phone: string;
  categoryId: string;
  location: string;
  description: string;
  /** Inloggad anmälare. Sätts av servern från sessionen, aldrig från formuläret. */
  memberId?: string | null;
}

export type MaintenanceCreateResult =
  | { ok: true; request: MaintenanceRequest }
  | { ok: false; error: string };

export async function createMaintenanceRequest(
  input: MaintenanceInput,
): Promise<MaintenanceCreateResult> {
  const { db, associationId } = await getTenantDb();

  // Kategorin slås upp via den tenant-scopade klienten, så ett id från en
  // annan förening ger null här i stället för ett främmande-nyckel-fel.
  const category = await db.maintenanceCategory.findFirst({
    where: { id: input.categoryId },
  });
  if (!category) return { ok: false, error: "Välj en kategori." };

  // Löpnumret är nästa lediga i föreningen. Två anmälningar samtidigt kan få
  // samma förslag – det unika indexet stoppar den ena, som då försöker igen.
  for (let attempt = 0; ; attempt++) {
    const last = await db.maintenanceRequest.aggregate({
      _max: { number: true },
    });
    try {
      const row = await db.maintenanceRequest.create({
        data: {
          associationId,
          ...input,
          number: (last._max.number ?? 0) + 1,
          // Medlemmen har "sett" sitt ärende när hen skickar in det – annars
          // skulle det räknas som en ny uppdatering direkt.
          memberSeenAt: input.memberId ? new Date() : null,
        },
        include: { category: true, events: true },
      });
      return { ok: true, request: toRequest(row) };
    } catch (error) {
      const clash =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";
      if (!clash || attempt >= 4) throw error;
    }
  }
}

export interface RequestUpdate {
  status: MaintenanceStatus;
  assignedTo: string;
  /** Styrelsens beslut. Tom sträng = inget den här gången. */
  decision: string;
  /** Ska beslutet synas för medlemmen på Mina sidor? */
  decisionVisible: boolean;
  /** Svar till medlemmen – syns alltid på Mina sidor. */
  reply: string;
  /** Intern notering – syns bara för styrelsen. */
  note: string;
  /** Namnet på den som sparar, för historiken. */
  author: string;
}

export interface RequestUpdateResult {
  request: MaintenanceRequest;
  statusChanged: boolean;
  /** Fick medlemmen något nytt att läsa – ett svar eller ett synligt beslut? */
  messageToMember: boolean;
}

/**
 * Sparar status och tilldelning, och lägger till händelser i
 * historiken: en per text som skrivits – beslut, svar, notering, i den
 * ordningen. Statusändringen följer med den första. Ändras bara status utan
 * text blir den en egen händelse, så att tidslinjen visar vad som hände och
 * inte bara vad någon skrev.
 *
 * Händelserna skrivs ALDRIG över, och allt sparas i en transaktion – ett
 * ärende blir aldrig halvsparat.
 */
export async function updateMaintenanceRequest(
  id: string,
  input: RequestUpdate,
): Promise<RequestUpdateResult | null> {
  const { db, associationId } = await getTenantDb();

  const before = await db.maintenanceRequest.findFirst({
    where: { id },
    select: { status: true },
  });
  if (!before) return null;

  const statusChanged = before.status !== input.status;
  const events: { kind: MaintenanceEventKind; body: string; visible: boolean }[] = [
    { kind: "decision" as const, body: input.decision.trim(), visible: input.decisionVisible },
    { kind: "reply" as const, body: input.reply.trim(), visible: true },
    { kind: "note" as const, body: input.note.trim(), visible: false },
  ].filter((e) => e.body);
  if (events.length === 0 && statusChanged) {
    events.push({ kind: "note", body: "", visible: false });
  }

  await db.$transaction(async (tx) => {
    await tx.maintenanceRequest.updateMany({
      where: { id },
      data: {
        status: input.status,
        assignedTo: input.assignedTo.trim(),
      },
    });
    for (const [index, event] of events.entries()) {
      const first = index === 0 && statusChanged;
      await tx.maintenanceEvent.create({
        data: {
          associationId,
          requestId: id,
          kind: event.kind,
          body: event.body,
          visibleToMember: event.visible,
          statusFrom: first ? before.status : null,
          statusTo: first ? input.status : null,
          author: input.author.trim(),
        },
      });
    }
  });

  const row = await db.maintenanceRequest.findFirst({
    where: { id },
    include: { category: true, events: { orderBy: { createdAt: "asc" } } },
  });
  return row
    ? {
        request: toRequest(row),
        statusChanged,
        messageToMember: events.some((e) => e.visible && e.body !== ""),
      }
    : null;
}



// ---------------------------------------------------------------------------
// Medlemmens egna ärenden (Mina sidor)
// ---------------------------------------------------------------------------

/**
 * Statusändringar och det styrelsen valt att visa. Vem som skrev något hämtas
 * inte ens, och texten i en statusrad som är en intern notering sorteras bort i
 * toMemberMessages innan något lämnar servern.
 */
const memberEvents = {
  where: { OR: [{ statusTo: { not: null } }, { visibleToMember: true }] },
  orderBy: { createdAt: "asc" as const },
  select: {
    id: true,
    kind: true,
    body: true,
    visibleToMember: true,
    statusTo: true,
    createdAt: true,
  },
} satisfies Prisma.MaintenanceRequest$eventsArgs;

/** Svar och synliga beslut, äldst först. Interna noteringar följer aldrig med. */
function toMemberMessages(
  events: {
    id: string;
    kind: MaintenanceEventKind;
    body: string;
    visibleToMember: boolean;
    createdAt: Date;
  }[],
): MemberMaintenanceMessage[] {
  const messages: MemberMaintenanceMessage[] = [];
  for (const e of events) {
    if (!e.visibleToMember || !e.body || e.kind === "note") continue;
    messages.push({
      id: e.id,
      kind: e.kind,
      body: e.body,
      createdAt: e.createdAt.toISOString(),
    });
  }
  return messages;
}

/** Medlemmens felanmälningar, nyast först – aktiva och åtgärdade. */
export async function getMemberMaintenanceRequests(
  memberId: string,
): Promise<MemberMaintenanceRequest[]> {
  const { db } = await getTenantDb();
  const rows = await db.maintenanceRequest.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      location: true,
      description: true,
      status: true,
      createdAt: true,
      memberSeenAt: true,
      category: { select: { name: true } },
      events: memberEvents,
    },
  });

  return rows.map((r) => {
    // Äldst först, så den senaste övergången till en status vinner.
    const statusDates: MemberMaintenanceRequest["statusDates"] = {
      ny: r.createdAt.toISOString(),
    };
    for (const e of r.events) {
      if (e.statusTo) statusDates[e.statusTo] = e.createdAt.toISOString();
    }
    // Både en ny status och ett nytt svar räknas som en uppdatering.
    const lastChange = r.events.at(-1)?.createdAt ?? null;

    return {
      id: r.id,
      number: r.number,
      categoryName: r.category.name,
      location: r.location,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      statusDates,
      messages: toMemberMessages(r.events),
      hasUpdate: hasStatusUpdate(lastChange, r.memberSeenAt, r.createdAt),
    };
  });
}

/** Underlaget för märket i medlemsmenyn. Liten fråga – körs på varje medlemssida. */
export async function getMemberMaintenanceSummary(
  memberId: string,
): Promise<MemberMaintenanceSummary> {
  const { db } = await getTenantDb();
  const rows = await db.maintenanceRequest.findMany({
    where: { memberId, status: { not: "atgardad" } },
    select: {
      status: true,
      createdAt: true,
      memberSeenAt: true,
      events: {
        where: { OR: [{ statusTo: { not: null } }, { visibleToMember: true }] },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  const active = rows.filter((r) => isActiveMaintenanceStatus(r.status));
  return {
    active: active.length,
    activeUpdates: active.filter((r) =>
      hasStatusUpdate(r.events[0]?.createdAt ?? null, r.memberSeenAt, r.createdAt),
    ).length,
  };
}

/** Medlemmen har tittat på sina ärenden: nuvarande statusar räknas som sedda. */
export async function markMemberMaintenanceSeen(memberId: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.maintenanceRequest.updateMany({
    where: { memberId },
    data: { memberSeenAt: new Date() },
  });
}
