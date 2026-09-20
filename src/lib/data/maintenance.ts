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
  MaintenanceRequest,
  MaintenanceSettings,
  MaintenanceStatus,
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

  const row = await db.maintenanceRequest.create({
    data: {
      associationId,
      ...input,
      // Medlemmen har "sett" sitt ärende när hen skickar in det – annars
      // skulle det räknas som en ny uppdatering direkt.
      memberSeenAt: input.memberId ? new Date() : null,
    },
    include: { category: true, events: true },
  });
  return { ok: true, request: toRequest(row) };
}

export interface RequestUpdate {
  status: MaintenanceStatus;
  assignedTo: string;
  /** Ny notering. Tom sträng = ingen notering den här gången. */
  note: string;
  /** Namnet på den som sparar, för historiken. */
  author: string;
}

/**
 * Sparar status och tilldelning, och lägger till en rad i historiken.
 *
 * Noteringen skrivs ALDRIG över – varje sparning blir en ny händelse. Ändras
 * bara status utan notering loggas det ändå, så att tidslinjen visar vad som
 * hände och inte bara vad någon skrev.
 */
export async function updateMaintenanceRequest(
  id: string,
  input: RequestUpdate,
): Promise<{ request: MaintenanceRequest; statusChanged: boolean } | null> {
  const { db, associationId } = await getTenantDb();

  const before = await db.maintenanceRequest.findFirst({
    where: { id },
    select: { status: true },
  });
  if (!before) return null;

  await db.maintenanceRequest.updateMany({
    where: { id },
    data: { status: input.status, assignedTo: input.assignedTo.trim() },
  });

  const body = input.note.trim();
  const statusChanged = before.status !== input.status;
  if (body || statusChanged) {
    await db.maintenanceEvent.create({
      data: {
        associationId,
        requestId: id,
        body,
        statusFrom: statusChanged ? before.status : null,
        statusTo: statusChanged ? input.status : null,
        author: input.author.trim(),
      },
    });
  }

  const row = await db.maintenanceRequest.findFirst({
    where: { id },
    include: { category: true, events: { orderBy: { createdAt: "asc" } } },
  });
  return row ? { request: toRequest(row), statusChanged } : null;
}



// ---------------------------------------------------------------------------
// Medlemmens egna ärenden (Mina sidor)
// ---------------------------------------------------------------------------

/**
 * Bara statusändringar. Noteringarna och vem som skrev dem är styrelsens
 * interna och hämtas inte ens – då kan de inte råka följa med ut.
 */
const statusEvents = {
  where: { statusTo: { not: null } },
  orderBy: { createdAt: "asc" },
  select: { statusTo: true, createdAt: true },
} as const;

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
      location: true,
      description: true,
      status: true,
      createdAt: true,
      memberSeenAt: true,
      category: { select: { name: true } },
      events: statusEvents,
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
    const lastChange = r.events.at(-1)?.createdAt ?? null;

    return {
      id: r.id,
      categoryName: r.category.name,
      location: r.location,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      statusDates,
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
        where: { statusTo: { not: null } },
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
