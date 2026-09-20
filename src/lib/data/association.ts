import { cache } from "react";
import type { Association } from "@prisma/client";
import type {
  AssociationInfo,
  AssociationProfile,
  SiteContent,
} from "@/lib/types";
import { getCurrentAssociation, getTenantDb } from "@/lib/tenant";
import { EMPTY_ASSOCIATION_INFO, emptySiteContent } from "./defaults";

// ---------------------------------------------------------------------------
// Identitet – namn, adress och kontaktuppgifter på föreningsraden
// ---------------------------------------------------------------------------

function toProfile(a: Association): AssociationProfile {
  return {
    name: a.name,
    shortName: a.shortName,
    organizationNumber: a.organizationNumber,
    street: a.street,
    postalCode: a.postalCode,
    city: a.city,
    contactEmail: a.contactEmail,
    contactPhone: a.contactPhone,
    propertyManagerName: a.propertyManagerName,
    propertyManagerPhone: a.propertyManagerPhone,
    propertyManagerEmail: a.propertyManagerEmail,
  };
}

/**
 * Föreningens identitet. Läser föreningsraden som redan hämtats för den här
 * requesten (getCurrentAssociation är cachad) – header och footer kostar
 * därför ingen extra fråga.
 */
export async function getAssociationProfile(): Promise<AssociationProfile> {
  return toProfile(await getCurrentAssociation());
}

/**
 * Association är själva tenanten och auto-scopas inte av getTenantDb(), så
 * raden pekas ut uttryckligen med den aktuella föreningens id.
 */
export async function updateAssociationProfile(
  input: AssociationProfile,
): Promise<void> {
  const { db, associationId } = await getTenantDb();
  await db.association.update({ where: { id: associationId }, data: input });
}

// ---------------------------------------------------------------------------
// Sidinnehåll och föreningsfakta
// ---------------------------------------------------------------------------

/**
 * Cachad per request: root-layouten läser heron och sidan läser samma rad
 * (startsidan, Om föreningen) – annars blir det två frågor per sidvisning.
 */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const { db } = await getTenantDb();
  const row = await db.siteContent.findFirst({});
  if (!row) return emptySiteContent((await getCurrentAssociation()).name);
  return {
    heroTitle: row.heroTitle,
    heroSubtitle: row.heroSubtitle,
    welcomeBody: row.welcomeBody,
    aboutBody: row.aboutBody,
  };
});

export async function updateSiteContent(
  patch: Partial<SiteContent>,
): Promise<SiteContent> {
  const { db, associationId } = await getTenantDb();
  const merged = { ...(await getSiteContent()), ...patch };
  const existing = await db.siteContent.findFirst({});
  if (existing) {
    await db.siteContent.updateMany({ where: {}, data: merged });
  } else {
    await db.siteContent.create({ data: { associationId, ...merged } });
  }
  return merged;
}

export async function getAssociationInfo(): Promise<AssociationInfo> {
  const { db } = await getTenantDb();
  const row = await db.associationInfo.findFirst({});
  if (!row) return EMPTY_ASSOCIATION_INFO;
  return {
    builtYear: row.builtYear,
    apartments: row.apartments,
    associationType: row.associationType,
    landOwnership: row.landOwnership,
    heating: row.heating,
    broadband: row.broadband,
    parking: row.parking,
    laundry: row.laundry,
    commonAreas: row.commonAreas,
    feesInfo: row.feesInfo,
    economySummary: row.economySummary,
    renovationsDone: row.renovationsDone,
    renovationsPlanned: row.renovationsPlanned,
    pets: row.pets,
    energyClass: row.energyClass,
  };
}

export async function updateAssociationInfo(
  patch: Partial<AssociationInfo>,
): Promise<AssociationInfo> {
  const { db, associationId } = await getTenantDb();
  const merged = { ...(await getAssociationInfo()), ...patch };
  const existing = await db.associationInfo.findFirst({});
  if (existing) {
    await db.associationInfo.updateMany({ where: {}, data: merged });
  } else {
    await db.associationInfo.create({ data: { associationId, ...merged } });
  }
  return merged;
}
