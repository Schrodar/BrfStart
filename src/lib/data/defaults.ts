// Innehåll för singelraderna (SiteContent + AssociationInfo) och för
// föreningens identitet (namn, adress och kontakt på Association-raden).
//
// TVÅ UPPSÄTTNINGAR MED FLIT – slå inte ihop dem:
//
//   DEMO_* / demo*    påhittad men trovärdig demodata. Används BARA av
//            seed-scripten (prisma/seed.ts, scripts/seed-demo-tenants.ts) för
//            att fylla utvecklingsföreningar med något att titta på.
//
//   EMPTY_* / empty*  tomma värden. Används av scripts/create-association.ts
//            när en ny förening skapas, och som fallback i association.ts när
//            raden saknas.
//
// Varför: DEMO-värdena innehåller konkreta påståenden om en fastighet –
// byggår, antal lägenheter, energiklass, genomförda renoveringar. Serveras de
// som fallback publicerar en skarp förening som glömt fylla i Föreningsinfo
// uppgifter om sitt hus som ingen har kontrollerat, på sidan som riktar sig
// till mäklare och spekulanter.
//
// OBS: relativa importer med flit – så att prisma/seed.ts kan importera detta
// via tsx utan tsconfig-path-alias.

import type {
  AssociationInfo,
  AssociationProfile,
  EconomyFigures,
  SiteContent,
} from "../types";

/** Identiteten för demoföreningen i prisma/seed.ts. */
export const DEMO_ASSOCIATION_PROFILE: AssociationProfile = {
  name: "Brf Exempelgården",
  shortName: "",
  organizationNumber: "769600-0000",
  street: "Exempelgatan 12",
  postalCode: "123 45",
  city: "Exempelstad",
  contactEmail: "styrelsen@brf-exempelgarden.se",
  contactPhone: "",
  propertyManagerName: "Exempel Förvaltning AB",
  propertyManagerPhone: "08-123 45 67",
  propertyManagerEmail: "kundtjanst@exempelforvaltning.se",
};

/** Demotexter för startsidan och Om föreningen, byggda på föreningens uppgifter. */
export function demoSiteContent(
  profile: Pick<AssociationProfile, "name" | "street" | "city">,
): SiteContent {
  return {
    heroTitle: `Välkommen till ${profile.name}`,
    heroSubtitle: `Ett trivsamt boende i centrala ${profile.city} – här hittar du information för boende, mäklare och besökare.`,
    welcomeBody:
      'På den här sidan samlar vi allt du behöver som boende: nyheter från styrelsen, viktiga dokument och felanmälan. Är du mäklare eller spekulant hittar du föreningsfakta under "För mäklare".',
    aboutBody: `${profile.name} bildades 1962 och omfattar 48 lägenheter fördelade på tre trapphus.\n\n## Fastigheten\nFöreningen äger och förvaltar fastigheten på ${profile.street}. Här finns gemensam tvättstuga, cykelrum, förråd och en trivsam innergård.\n\n## Vår ambition\nVi arbetar för ett välskött, tryggt och ekonomiskt stabilt boende med god gemenskap mellan grannarna.`,
  };
}

export const DEMO_ASSOCIATION_INFO: AssociationInfo = {
  builtYear: 1962,
  apartments: 48,
  associationType: "Äkta bostadsrättsförening",
  landOwnership: "Äganderätt (friköpt tomt)",
  heating: "Fjärrvärme",
  broadband: "Fiber via öppet stadsnät ingår i avgiften",
  parking: "Garageplatser och p-platser med kö",
  laundry: "Gemensam tvättstuga",
  commonAreas: "Gemensamhetslokal, cykelrum, förråd, innergård",
  feesInfo:
    "I månadsavgiften ingår värme, vatten, bredband och kabel-TV. El debiteras separat per lägenhet.",
  economySummary:
    "Föreningen har en stabil ekonomi med god soliditet och långsiktig underhållsplan. Senaste avgiftshöjningen gjordes 2025.",
  renovationsDone: [
    "Nytt tak (2020)",
    "Omdragning av el i allmänna utrymmen (2019)",
    "Renoverad tvättstuga (2022)",
  ],
  renovationsPlanned: [
    "Stambyte trapphus B (start hösten 2026)",
    "Fasadrenovering (planerad 2028)",
  ],
  pets: "Husdjur är tillåtna. Andrahandsuthyrning kräver styrelsens godkännande enligt stadgarna.",
  energyClass: "D",
};

/** Tomt utgångsläge. Sidorna hoppar över fält som inte är ifyllda. */
export function emptySiteContent(associationName: string): SiteContent {
  return {
    heroTitle: `Välkommen till ${associationName}`,
    heroSubtitle: "",
    welcomeBody: "",
    aboutBody: "",
  };
}

/** Tomt utgångsläge. Noll och tom sträng betyder "inte ifyllt", inte "noll". */
export const EMPTY_ASSOCIATION_INFO: AssociationInfo = {
  builtYear: 0,
  apartments: 0,
  associationType: "",
  landOwnership: "",
  heating: "",
  broadband: "",
  parking: "",
  laundry: "",
  commonAreas: "",
  feesInfo: "",
  economySummary: "",
  renovationsDone: [],
  renovationsPlanned: [],
  pets: "",
  energyClass: "",
};

/**
 * Tomt utgångsläge för nyckeltalen. Det finns ingen DEMO-variant med flit:
 * påhittade skulder och avgifter för en verklig förening vore värre än inga.
 */
export const EMPTY_ECONOMY_FIGURES: EconomyFigures = {
  fiscalYear: "",
  annualFees: null,
  condoArea: null,
  interestBearingDebt: null,
  totalArea: null,
  netResult: null,
  depreciation: null,
  plannedMaintenance: null,
  disposals: null,
  nonRecurring: null,
  apartmentAreas: [],
  updatedAt: null,
};
