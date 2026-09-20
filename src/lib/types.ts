/**
 * Domäntyper för hela sajten. Samma typer används av mock-datalagret idag och
 * kan återanvändas rakt av när Supabase/Prisma kopplas in senare.
 */

export type Role = "admin" | "member";
export type MemberStatus = "pending" | "approved" | "rejected";

/** En användare (boende eller styrelseledamot). */
export interface Member {
  id: string;
  email: string;
  fullName: string;
  /** Lägenhetsnummer, t.ex. "1204". Frivilligt. */
  apartment: string;
  role: Role;
  status: MemberStatus;
  /** Får lägga upp/hantera säljannons för sin lägenhet. */
  canManageListing: boolean;
  createdAt: string; // ISO
}

/** Inloggad användare (delmängd av Member som exponeras i UI:t). */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  apartment: string;
  role: Role;
  status: MemberStatus;
  canManageListing: boolean;
}

/** Nyhet / aktuellt-inlägg. */
export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  /** Brödtext. Enkel markdown (## rubrik, tomrad = nytt stycke). */
  body: string;
  published: boolean;
  publishedAt: string | null; // ISO, null om utkast
  createdAt: string;
  updatedAt: string;
}

/** En grupp på styrelsesidan. Föreningen skapar sina egna. */
export interface BoardGroup {
  id: string;
  /** T.ex. "Styrelsen", "Valberedning", "Trädgårdsgruppen". */
  name: string;
  /** Gruppernas inbördes ordning på sidan (lägre först). */
  order: number;
}

/** Person i en grupp på styrelsesidan (roll: namn). */
export interface BoardMember {
  id: string;
  groupId: string;
  /** T.ex. "Ordförande", "Kassör", "Ledamot", "Suppleant". */
  role: string;
  name: string;
  email: string;
  /** Sorteringsordning inom gruppen (lägre först). */
  order: number;
}

/** En grupp med sina personer – det styrelsesidorna faktiskt renderar. */
export interface BoardGroupWithMembers extends BoardGroup {
  members: BoardMember[];
}

export type DocumentCategory =
  | "stadgar"
  | "arsredovisning"
  | "protokoll"
  | "ordningsregler"
  | "ovrigt";

export type DocumentVisibility = "public" | "member";

/** Dokument (PDF m.m.). Filen lagras i Supabase Storage när backend kopplas in. */
export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  /** Filnamnet på den uppladdade filen. */
  fileName: string;
  /**
   * Intern nedladdningslänk (/dokument/[id]/ladda-ner). Routen kontrollerar
   * synlighet vid varje klick och redirectar till en färsk signerad URL – den
   * signerade URL:en får aldrig renderas direkt, eftersom den går ut.
   */
  fileUrl: string;
  /** False för demorader utan uppladdad fil – då renderas ingen länk. */
  hasFile: boolean;
  sizeBytes: number;
  /** Läsbar storlek härledd ur sizeBytes, t.ex. "1,2 MB". */
  sizeLabel: string;
  uploadedAt: string;
}

/**
 * Föreningens identitet – visas i header, footer, kontakt- och mäklarsidan.
 * Redigeras under Föreningsinfo → Namn och kontakt. Tom sträng = visas inte.
 */
export interface AssociationProfile {
  name: string;
  /** Som det är ifyllt – tomt betyder samma som namnet. Visa via shortNameOf(). */
  shortName: string;
  organizationNumber: string;
  street: string;
  postalCode: string;
  city: string;
  /** Styrelsens publika e-post och telefon. */
  contactEmail: string;
  contactPhone: string;
  propertyManagerName: string;
  propertyManagerPhone: string;
  propertyManagerEmail: string;
}

/** Redigerbart sidinnehåll (startsida + Om föreningen). */
export interface SiteContent {
  heroTitle: string;
  heroSubtitle: string;
  /** Kort välkomsttext på startsidan. */
  welcomeBody: string;
  /** Brödtext på "Om föreningen". Enkel markdown. */
  aboutBody: string;
}

/** Föreningsfakta – används på "Om föreningen" och mäklarsidan. Redigeras i admin. */
export interface AssociationInfo {
  builtYear: number;
  apartments: number;
  /** Upplåtelseform, t.ex. "Äkta bostadsrättsförening". */
  associationType: string;
  /** Mark, t.ex. "Äganderätt" eller "Tomträtt". */
  landOwnership: string;
  heating: string;
  broadband: string;
  parking: string;
  laundry: string;
  commonAreas: string;
  /** Policy för avgiften och vad som ingår. */
  feesInfo: string;
  /** Kort om föreningens ekonomi. */
  economySummary: string;
  /** Genomförda större renoveringar. */
  renovationsDone: string[];
  /** Planerat underhåll. */
  renovationsPlanned: string[];
  /** Djurhållning, andrahandsuthyrning m.m. */
  pets: string;
  energyClass: string;
}

/** En lägenhet i uträkningen av bostadsrättsytan. */
export interface ApartmentArea {
  /** Lägenhetsnummer eller annan beteckning, t.ex. "1101". */
  label: string;
  sqm: number;
}

/**
 * Underlaget för nyckeltalen på /ekonomi. Redigeras i admin.
 *
 * null = inte ifyllt; 0 är ett giltigt värde. Själva nyckeltalen sparas aldrig
 * utan räknas fram ur underlaget i src/lib/key-figures.ts, som också beskriver
 * vad varje fält ska innehålla.
 */
export interface EconomyFigures {
  fiscalYear: string;
  annualFees: number | null;
  condoArea: number | null;
  interestBearingDebt: number | null;
  totalArea: number | null;
  netResult: number | null;
  depreciation: number | null;
  plannedMaintenance: number | null;
  disposals: number | null;
  nonRecurring: number | null;
  /** Lägenheterna bostadsrättsytan räknades fram ur. Tom = ytan skrevs in direkt. */
  apartmentAreas: ApartmentArea[];
  /** Senast sparad. null om inget sparats. */
  updatedAt: string | null;
}

/**
 * Kategorin så som den publika sidan får se den. Underleverantörsuppgifterna
 * ligger medvetet UTANFÖR den här typen: props till klientkomponenter hamnar i
 * sidans payload, så allt som finns med här blir läsbart för besökaren.
 */
export interface MaintenanceCategoryOption {
  id: string;
  name: string;
  order: number;
}

/** Kategori för felanmälan, med styrelsens interna uppgifter. Endast admin. */
export interface MaintenanceCategory extends MaintenanceCategoryOption {
  /** Underleverantör som hanterar kategorin. Internt – visas aldrig publikt. */
  contractorName: string;
  contractorPhone: string;
  contractorEmail: string;
  contractorInfo: string;
}

export type MaintenanceStatus = "ny" | "pagar" | "atgardad";

/** Redigerbara texter och nummer på felanmälningssidan. */
export interface MaintenanceSettings {
  introText: string;
  emergencyPhone: string;
  emergencyText: string;
  caretakerName: string;
  caretakerPhone: string;
  caretakerText: string;
}

/** En händelse i ett ärendes historik. Skrivs bara till, ändras aldrig. */
export interface MaintenanceEvent {
  id: string;
  /** Tom när händelsen bara är en statusändring. */
  body: string;
  statusFrom: MaintenanceStatus | null;
  statusTo: MaintenanceStatus | null;
  author: string;
  createdAt: string;
}

/** Felanmälan från boende/besökare. */
export interface MaintenanceRequest {
  id: string;
  /** Valfritt – anmälaren behöver inte uppge namn. */
  name: string;
  /** Minst en av email/phone är ifylld. */
  email: string;
  phone: string;
  categoryId: string;
  /** Kategorinamnet, denormaliserat för visning. */
  categoryName: string;
  /** Vem som ska utföra jobbet. Nuvarande läge, inte historik. */
  assignedTo: string;
  /** Medlemmen som anmälde inloggad. null = besökare eller utloggad anmälare. */
  memberId: string | null;
  /** Ärendets historik, äldst först. Visas aldrig för anmälaren. */
  events: MaintenanceEvent[];
  /** Var felet finns, t.ex. "Tvättstuga plan 1". */
  location: string;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
}

/**
 * En felanmälan så som medlemmen själv ser den på Mina sidor.
 *
 * Medvetet smalare än MaintenanceRequest: styrelsens noteringar, vem som
 * skrev dem och vem som tilldelats jobbet är interna och får inte hamna i
 * sidans payload.
 */
export interface MemberMaintenanceRequest {
  id: string;
  categoryName: string;
  location: string;
  description: string;
  status: MaintenanceStatus;
  createdAt: string;
  /** När ärendet senast fick respektive status (ISO). "ny" = när det skickades in. */
  statusDates: Partial<Record<MaintenanceStatus, string>>;
  /** Statusen har ändrats sedan medlemmen senast tittade. */
  hasUpdate: boolean;
}

/** Underlaget för märket i medlemsmenyn. */
export interface MemberMaintenanceSummary {
  /** Ärenden som inte är åtgärdade. */
  active: number;
  /** Aktiva ärenden vars status ändrats sedan medlemmen senast tittade. */
  activeUpdates: number;
}

/** Ett hus / trapphus. Namnet är fritt – "Hus 43", "Trapphus B", en adress. */
export interface Building {
  id: string;
  name: string;
  address: string;
  /** Husens inbördes ordning i registret (lägre först). */
  order: number;
  /** Första föreningsnumret vid massinläggning i huset, t.ex. "23". */
  numberStart: string;
  /** True = översta våningen får de lägsta föreningsnumren. */
  numberTopDown: boolean;
}

/** Hus med räknare – det översiktskorten visar. */
export interface BuildingWithCounts extends Building {
  apartmentCount: number;
  forSaleCount: number;
}

export type ListingStatus = "draft" | "published";

/** Annonsfoto (publik fil). `url` är den publika Storage-URL:en. */
export interface ApartmentPhoto {
  id: string;
  path: string;
  url: string;
  caption: string;
  sortOrder: number;
}

/**
 * En lägenhet – nav mellan boende, planritning och säljannons.
 * `floorPlanUrl` fylls i av datalagret vid behov: för ägaren och styrelsen en
 * signerad URL, och för en publik annons länken till routen
 * /till-salu/[id]/planritning, som signerar om vid varje klick.
 */
export interface Apartment {
  id: string;
  /** Föreningens eget lägenhetsnummer, t.ex. "23". */
  number: string;
  /** Lantmäteriets nummer, t.ex. "1101". Tom sträng om det inte är satt. */
  standardNumber: string;
  ownerMemberId: string | null;
  /** Null = inte placerad i något hus ännu. */
  buildingId: string | null;

  // Fakta
  floor: string;
  rooms: string;
  sizeSqm: string;
  description: string;

  // Planritning
  floorPlanPath: string | null;
  floorPlanUrl: string | null;

  // Säljannons
  forSale: boolean;
  listingStatus: ListingStatus;
  price: string;
  monthlyFee: string;
  viewingInfo: string;
  saleDescription: string;
  brokerName: string;
  brokerPhone: string;
  brokerEmail: string;
  hemnetUrl: string;
  showFloorPlanPublicly: boolean;
  publishedAt: string | null;

  createdAt: string;
  updatedAt: string;

  photos: ApartmentPhoto[];
}
