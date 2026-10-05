import type {
  Apartment as DbApartment,
  ApartmentPhoto as DbApartmentPhoto,
} from "@prisma/client";
import type { Apartment, ApartmentPhoto } from "@/lib/types";
import { getTenantDb } from "@/lib/tenant";
import { compareApartmentNumbers } from "@/lib/numbering";
import {
  BUCKET_FLOORPLANS,
  BUCKET_PHOTOS,
  getPublicUrl,
  getSignedUrl,
  removeFile,
} from "@/lib/storage";

type DbApartmentWithPhotos = DbApartment & { photos: DbApartmentPhoto[] };

const withPhotos = { photos: { orderBy: { sortOrder: "asc" } } } as const;

function toPhoto(p: DbApartmentPhoto): ApartmentPhoto {
  return {
    id: p.id,
    path: p.path,
    url: getPublicUrl(BUCKET_PHOTOS, p.path),
    caption: p.caption,
    sortOrder: p.sortOrder,
  };
}

function toApartment(
  a: DbApartmentWithPhotos,
  floorPlanUrl: string | null,
): Apartment {
  return {
    id: a.id,
    number: a.number,
    standardNumber: a.standardNumber,
    ownerMemberId: a.ownerMemberId,
    buildingId: a.buildingId,
    floor: a.floor,
    rooms: a.rooms,
    sizeSqm: a.sizeSqm,
    description: a.description,
    floorPlanPath: a.floorPlanPath,
    floorPlanUrl,
    forSale: a.forSale,
    listingStatus: a.listingStatus,
    price: a.price,
    monthlyFee: a.monthlyFee,
    viewingInfo: a.viewingInfo,
    saleDescription: a.saleDescription,
    brokerName: a.brokerName,
    brokerPhone: a.brokerPhone,
    brokerEmail: a.brokerEmail,
    hemnetUrl: a.hemnetUrl,
    showFloorPlanPublicly: a.showFloorPlanPublicly,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
    submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    photos: a.photos.map(toPhoto),
  };
}

async function floorPlanUrlFor(
  a: DbApartment,
  allowed: boolean,
): Promise<string | null> {
  if (!allowed || !a.floorPlanPath) return null;
  return getSignedUrl(BUCKET_FLOORPLANS, a.floorPlanPath);
}

// ---------------------------------------------------------------------------
// Läsning
// ---------------------------------------------------------------------------

/**
 * Ordningen i admin/Till salu: det som väntar på styrelsen först, sedan
 * utkast, sist publicerade.
 */
function listingRank(a: Apartment): number {
  if (a.listingStatus === "published") return 2;
  return a.submittedAt ? 0 : 1;
}

/** Alla lägenheter som är till salu – utkast och publicerade (admin/Till salu). */
export async function getListings(): Promise<Apartment[]> {
  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({
    where: { forSale: true },
    include: withPhotos,
  });
  return rows
    .map((a) => toApartment(a, null))
    .sort(
      (x, y) =>
        listingRank(x) - listingRank(y) ||
        compareApartmentNumbers(x.number, y.number),
    );
}

/** Antal annonser som boende skickat till styrelsen (adminöversikten). */
export async function countSubmittedListings(): Promise<number> {
  const { db } = await getTenantDb();
  return db.apartment.count({
    where: { forSale: true, listingStatus: "draft", submittedAt: { not: null } },
  });
}

/** Lägenheter som INTE är till salu – urvalet när en ny annons ska påbörjas. */
export async function getApartmentsNotForSale(): Promise<Apartment[]> {
  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({
    where: { forSale: false },
    include: withPhotos,
  });
  return rows.map((a) => toApartment(a, null)).sort((x, y) => compareApartmentNumbers(x.number, y.number));
}

export async function getPublishedListings(): Promise<Apartment[]> {
  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({
    where: { forSale: true, listingStatus: "published" },
    include: withPhotos,
    orderBy: { publishedAt: "desc" },
  });
  return rows.map((a) => toApartment(a, null));
}

export async function getListingById(id: string): Promise<Apartment | null> {
  const { db } = await getTenantDb();
  const a = await db.apartment.findFirst({
    where: { id, forSale: true, listingStatus: "published" },
    include: withPhotos,
  });
  if (!a) return null;
  // Publikt renderas ALDRIG en signerad URL – den går ut efter en timme och
  // en öppen annonssida skulle sluta fungera. I stället pekar länken på en
  // route som kontrollerar och signerar vid varje klick.
  const floorPlan =
    a.showFloorPlanPublicly && a.floorPlanPath
      ? `/till-salu/${a.id}/planritning`
      : null;
  return toApartment(a, floorPlan);
}

/**
 * Planritningens lagringsväg för en publik annons. Null när annonsen inte är
 * publicerad eller planritningen inte ska visas publikt – uppslaget är
 * tenant-scopat, så ett id från en annan förening ger null.
 */
export async function getPublicFloorPlanPath(
  id: string,
): Promise<string | null> {
  const { db } = await getTenantDb();
  const a = await db.apartment.findFirst({
    where: {
      id,
      forSale: true,
      listingStatus: "published",
      showFloorPlanPublicly: true,
    },
    select: { floorPlanPath: true },
  });
  return a?.floorPlanPath ?? null;
}

export async function getOwnedApartment(
  memberId: string,
): Promise<Apartment | null> {
  const { db } = await getTenantDb();
  const a = await db.apartment.findFirst({
    where: { ownerMemberId: memberId },
    include: withPhotos,
  });
  if (!a) return null;
  return toApartment(a, await floorPlanUrlFor(a, true));
}

export async function getApartmentById(id: string): Promise<Apartment | null> {
  const { db } = await getTenantDb();
  const a = await db.apartment.findFirst({ where: { id }, include: withPhotos });
  if (!a) return null;
  return toApartment(a, await floorPlanUrlFor(a, true));
}

export async function getAllApartments(): Promise<Apartment[]> {
  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({ include: withPhotos });
  return rows.map((a) => toApartment(a, null)).sort((x, y) => compareApartmentNumbers(x.number, y.number));
}

/** Lägenheterna i ett hus. */
export async function getApartmentsByBuilding(
  buildingId: string,
): Promise<Apartment[]> {
  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({
    where: { buildingId },
    include: withPhotos,
  });
  return rows.map((a) => toApartment(a, null)).sort((x, y) => compareApartmentNumbers(x.number, y.number));
}

/**
 * Lägenheter utan hus. Hit hamnar bland annat de som skapats automatiskt när
 * en boende loggat in – styrelsen ser dem och kan placera dem i rätt hus.
 */
export async function getUnassignedApartments(): Promise<Apartment[]> {
  const { db } = await getTenantDb();
  const rows = await db.apartment.findMany({
    where: { buildingId: null },
    include: withPhotos,
  });
  return rows.map((a) => toApartment(a, null)).sort((x, y) => compareApartmentNumbers(x.number, y.number));
}

/** Flyttar en lägenhet till ett hus, eller ut ur alla hus (null). */
export async function setApartmentBuilding(
  id: string,
  buildingId: string | null,
): Promise<void> {
  const { db } = await getTenantDb();
  if (buildingId) {
    const building = await db.building.findFirst({ where: { id: buildingId } });
    if (!building) return; // hus från annan förening – ignoreras
  }
  await db.apartment.updateMany({ where: { id }, data: { buildingId } });
}

/**
 * Hämtar den boendes lägenhet, eller skapar/knyter en via lägenhetsnumret.
 * Returnerar null om numret saknas eller ägs av någon annan.
 */
export async function getOrCreateOwnedApartment(member: {
  id: string;
  apartment: string;
}): Promise<Apartment | null> {
  const { db, associationId } = await getTenantDb();

  const owned = await db.apartment.findFirst({
    where: { ownerMemberId: member.id },
    include: withPhotos,
  });
  if (owned) return toApartment(owned, await floorPlanUrlFor(owned, true));

  const number = member.apartment.trim();
  if (!number) return null;

  const existing = await db.apartment.findFirst({ where: { number } });
  if (existing) {
    if (existing.ownerMemberId && existing.ownerMemberId !== member.id) {
      return null; // ägs av någon annan
    }
    await db.apartment.updateMany({
      where: { id: existing.id },
      data: { ownerMemberId: member.id },
    });
    const claimed = await db.apartment.findFirst({
      where: { id: existing.id },
      include: withPhotos,
    });
    return claimed ? toApartment(claimed, await floorPlanUrlFor(claimed, true)) : null;
  }

  const created = await db.apartment.create({
    data: { associationId, number, ownerMemberId: member.id },
    include: withPhotos,
  });
  return toApartment(created, await floorPlanUrlFor(created, true));
}

// ---------------------------------------------------------------------------
// Skrivning
// ---------------------------------------------------------------------------

export interface FactsInput {
  /** Föreningens lägenhetsnummer. Autogenererade nummer är bara förslag – de
   *  går att skriva om för föreningar med eget system. */
  number: string;
  /** Lantmäteriets nummer, t.ex. "1101". Får vara tomt. */
  standardNumber: string;
  floor: string;
  rooms: string;
  sizeSqm: string;
  description: string;
}

export type FactsResult = { ok: true } | { ok: false; error: string };

export async function updateApartmentFacts(
  id: string,
  input: FactsInput,
): Promise<FactsResult> {
  const { db } = await getTenantDb();
  const number = input.number.trim();
  if (!number) return { ok: false, error: "Ange lägenhetsnummer." };

  // Numret är unikt per förening – fånga krocken här så att den boende får ett
  // begripligt meddelande i stället för ett databasfel.
  const clash = await db.apartment.findFirst({
    where: { number, NOT: { id } },
    select: { id: true },
  });
  if (clash) {
    return { ok: false, error: `Lägenhet ${number} finns redan.` };
  }

  await db.apartment.updateMany({
    where: { id },
    data: {
      number,
      standardNumber: input.standardNumber.trim(),
      floor: input.floor,
      rooms: input.rooms,
      sizeSqm: input.sizeSqm,
      description: input.description,
    },
  });
  return { ok: true };
}

/** Sätter/rensar planritning. Returnerar tidigare path (för storage-cleanup). */
export async function setFloorPlan(
  id: string,
  path: string | null,
): Promise<string | null> {
  const { db } = await getTenantDb();
  const current = await db.apartment.findFirst({
    where: { id },
    select: { floorPlanPath: true },
  });
  await db.apartment.updateMany({ where: { id }, data: { floorPlanPath: path } });
  return current?.floorPlanPath ?? null;
}

export interface ListingInput {
  price: string;
  monthlyFee: string;
  viewingInfo: string;
  saleDescription: string;
  brokerName: string;
  brokerPhone: string;
  brokerEmail: string;
  hemnetUrl: string;
  showFloorPlanPublicly: boolean;
}

export async function updateListing(
  id: string,
  input: ListingInput,
): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({ where: { id }, data: input });
}

/**
 * En lägenhet har tre lägen, och de två sista skiljs åt så att "avpublicera"
 * inte längre betyder "sluta sälja":
 *
 *   forSale=false               → bara i lägenhetsregistret
 *   forSale=true, draft         → påbörjad annons, syns under Till salu i admin
 *   forSale=true, published     → publik på /till-salu
 */

/** Påbörjar en annons: lägenheten dyker upp under Till salu, men inte publikt. */
export async function startListing(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({
    where: { id },
    data: { forSale: true, listingStatus: "draft" },
  });
}

export async function publishListing(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({
    where: { id },
    data: {
      forSale: true,
      listingStatus: "published",
      publishedAt: new Date(),
      submittedAt: null,
    },
  });
}

/** Den boende skickar utkastet till styrelsen, som publicerar. */
export async function submitListing(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({
    where: { id, forSale: true, listingStatus: "draft" },
    data: { submittedAt: new Date() },
  });
}

/** Den boende tar tillbaka ett utkast som skickats till styrelsen. */
export async function withdrawListing(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({
    where: { id },
    data: { submittedAt: null },
  });
}

/** Tar bort annonsen från publika sidan men behåller den som utkast. */
export async function unpublishListing(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({
    where: { id },
    data: { listingStatus: "draft" },
  });
}

/** Avslutar försäljningen helt – lägenheten lämnar Till salu-listan. */
export async function endListing(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.apartment.updateMany({
    where: { id },
    data: { forSale: false, listingStatus: "draft", publishedAt: null, submittedAt: null },
  });
}

/**
 * Det som hör till en försäljning och inte till lägenheten. Fakta (våning,
 * rum, storlek, beskrivning) och planritningen behålls till nästa ägare.
 */
export const SALE_DATA_RESET = {
  forSale: false,
  listingStatus: "draft",
  publishedAt: null,
  submittedAt: null,
  price: "",
  monthlyFee: "",
  viewingInfo: "",
  saleDescription: "",
  brokerName: "",
  brokerPhone: "",
  brokerEmail: "",
  hemnetUrl: "",
  showFloorPlanPublicly: false,
} as const;

/**
 * Rensar en avslutad försäljning: annonsfälten töms och bilderna raderas,
 * både raderna och filerna. Fakta och planritning ligger kvar.
 */
export async function clearSaleData(apartmentId: string): Promise<void> {
  const { db } = await getTenantDb();
  const photos = await db.apartmentPhoto.findMany({
    where: { apartmentId },
    select: { path: true },
  });
  await db.apartmentPhoto.deleteMany({ where: { apartmentId } });
  await db.apartment.updateMany({ where: { id: apartmentId }, data: SALE_DATA_RESET });
  await Promise.all(photos.map((p) => removeFile(BUCKET_PHOTOS, p.path)));
}

/**
 * Ägarbyte: rensar försäljningen och kopplar bort den boende, så att nästa
 * ägare kan kopplas till lägenheten och ärver fakta och planritning – men
 * inte säljarens bilder och annons.
 */
export async function releaseApartment(apartmentId: string): Promise<void> {
  const { db } = await getTenantDb();
  await clearSaleData(apartmentId);
  await db.apartment.updateMany({
    where: { id: apartmentId },
    data: { ownerMemberId: null },
  });
}

/** Ägarbyte för medlemmens lägenhet, om hen har någon (innan kontot tas bort). */
export async function releaseApartmentOf(memberId: string): Promise<void> {
  const { db } = await getTenantDb();
  const owned = await db.apartment.findFirst({
    where: { ownerMemberId: memberId },
    select: { id: true },
  });
  if (owned) await releaseApartment(owned.id);
}

export async function addPhoto(
  apartmentId: string,
  path: string,
  caption = "",
): Promise<void> {
  const { db, associationId } = await getTenantDb();
  const sortOrder = await db.apartmentPhoto.count({ where: { apartmentId } });
  await db.apartmentPhoto.create({
    data: { associationId, apartmentId, path, caption, sortOrder },
  });
}

/** Tar bort ett foto och returnerar dess path (för storage-cleanup). */
export async function removePhoto(
  photoId: string,
  apartmentId?: string,
): Promise<string | null> {
  const { db } = await getTenantDb();
  const photo = await db.apartmentPhoto.findFirst({ where: { id: photoId } });
  if (!photo) return null;
  if (apartmentId && photo.apartmentId !== apartmentId) return null;
  await db.apartmentPhoto.deleteMany({ where: { id: photoId } });
  return photo.path;
}

export interface CreateApartmentInput {
  number: string;
  standardNumber: string;
  /** Tom sträng = ingen husplacering. */
  buildingId: string;
  floor: string;
  rooms: string;
  sizeSqm: string;
  description: string;
}

export type CreateApartmentResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createApartment(
  input: CreateApartmentInput,
): Promise<CreateApartmentResult> {
  const number = input.number.trim();
  if (!number) return { ok: false, error: "Ange lägenhetsnummer." };
  const { db, associationId } = await getTenantDb();
  const existing = await db.apartment.findFirst({ where: { number } });
  if (existing) {
    return { ok: false, error: "En lägenhet med det numret finns redan." };
  }
  const building = input.buildingId
    ? await db.building.findFirst({ where: { id: input.buildingId } })
    : null;

  const a = await db.apartment.create({
    data: {
      associationId,
      number,
      standardNumber: input.standardNumber.trim(),
      buildingId: building?.id ?? null,
      floor: input.floor,
      rooms: input.rooms,
      sizeSqm: input.sizeSqm,
      description: input.description,
    },
  });
  return { ok: true, id: a.id };
}

/** Tar bort lägenhet + foto-rader. Returnerar filpaths för storage-cleanup. */
export async function deleteApartment(
  id: string,
): Promise<{ floorPlanPath: string | null; photoPaths: string[] }> {
  const { db } = await getTenantDb();
  const a = await db.apartment.findFirst({
    where: { id },
    include: { photos: true },
  });
  if (!a) return { floorPlanPath: null, photoPaths: [] };
  const photoPaths = a.photos.map((p) => p.path);
  await db.apartment.deleteMany({ where: { id } }); // cascade → foton
  return { floorPlanPath: a.floorPlanPath, photoPaths };
}

/** Ägarkontroll för medlemsåtgärder. */
export async function isApartmentOwner(
  apartmentId: string,
  memberId: string,
): Promise<boolean> {
  const { db } = await getTenantDb();
  const a = await db.apartment.findFirst({
    where: { id: apartmentId },
    select: { ownerMemberId: true },
  });
  return a?.ownerMemberId === memberId;
}
