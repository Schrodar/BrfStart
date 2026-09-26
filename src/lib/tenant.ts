import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * =============================================================================
 * MULTI-TENANT
 * =============================================================================
 * Varje deploy betjänar EN förening, vald via ASSOCIATION_SLUG (env). All
 * dataccess går via getTenantDb() som ger { db, associationId }:
 *   - `db`  – Prisma-klient vars LÄSNINGAR och where-baserade skrivningar
 *             (findMany/findFirst/updateMany/deleteMany …) automatiskt filtreras
 *             på associationId. Detta stänger den farliga läck-vektorn.
 *   - `associationId` – sätts explicit i create-data (Prisma kräver det ändå vid
 *             kompilering, vilket gör skrivningar tenant-korrekta by design).
 *
 * Bas-`prisma` används BARA för att slå upp vilken förening deployen är. Varje
 * annan import av "@/lib/prisma" kringgår hela skyddet utan att det syns i
 * koden – gör inte det.
 */

/**
 * Modeller som har associationId och därmed ska auto-scopas. Lägger du till en
 * ny tabell med associationId MÅSTE den in här – utan den fungerar queryn som
 * vanligt, den läcker bara mellan föreningar utan att något syns.
 * Association själv står medvetet inte med: den *är* tenanten och slås upp med
 * bas-klienten i getCurrentAssociation().
 */
const ASSOCIATION_SCOPED_MODELS = new Set([
  "Member",
  "NewsPost",
  "BoardGroup",
  "BoardMember",
  "Document",
  "MaintenanceCategory",
  "MaintenanceSettings",
  "MaintenanceRequest",
  "MaintenanceEvent",
  "Building",
  "Apartment",
  "ApartmentPhoto",
  "SiteContent",
  "AssociationInfo",
  "EconomyFigures",
  // Supportsessioner hör till plattformspanelen, men scopas med flit: en token
  // som skapats för en förening kan då aldrig lösas in hos en annan.
  "SupportSession",
]);

/**
 * Operationer som tar en `where` och därmed ska auto-scopas.
 *
 * findUnique/update/delete tar en WhereUniqueInput. Prisma tillåter extra
 * icke-unika filter där och lägger dem i SQL:en med AND – verifierat mot
 * databasen: uppslag av en annan förenings rad ger null (findUnique) respektive
 * P2025 (update/delete), och raden lämnas orörd. Sammansatta nycklar som
 * Member.associationId_email krockar inte heller; villkoren AND:as ihop.
 *
 * `upsert` står med trots att den också tar `create`. Injiceringen rör bara
 * `where`, och utan den slår upsert upp raden enbart på id och UPPDATERAR en
 * annan förenings rad – en skarp cross-tenant-skrivning.
 *
 * Kvar utanför: create/createMany (tar ingen `where` – där kräver Prismas typer
 * att associationId anges, så kompilatorn fångar det) och rå SQL ($queryRaw
 * m.fl.), som alltid går förbi extensionen.
 */
const WHERE_OPS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "updateMany",
  "deleteMany",
  "update",
  "delete",
  "upsert",
]);

/** Aktuell förening (från ASSOCIATION_SLUG). Cachas per request. */
export const getCurrentAssociation = cache(async () => {
  const slug = process.env.ASSOCIATION_SLUG;
  if (!slug) {
    throw new Error(
      "ASSOCIATION_SLUG saknas i miljön – kan inte avgöra vilken förening deployen gäller.",
    );
  }
  const association = await prisma.association.findUnique({ where: { slug } });
  if (!association) {
    throw new Error(
      `Ingen förening med slug "${slug}". Kör: npm run association:create -- ${slug} "<namn>"`,
    );
  }
  return association;
});

export async function getCurrentAssociationId(): Promise<string> {
  return (await getCurrentAssociation()).id;
}

function buildTenantClient(associationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (ASSOCIATION_SCOPED_MODELS.has(model) && WHERE_OPS.has(operation)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const a: any = args ?? {};
            a.where = { ...(a.where ?? {}), associationId };
            return query(a);
          }
          // create/createMany: associationId sätts explicit i datalagret.
          return query(args);
        },
      },
    },
  });
}

/** Memoiserad tenant-klient per förening. */
const clientCache = new Map<string, ReturnType<typeof buildTenantClient>>();

/** Auto-scopad Prisma-klient + associationId för aktuell förening. */
export async function getTenantDb() {
  const associationId = await getCurrentAssociationId();
  let db = clientCache.get(associationId);
  if (!db) {
    db = buildTenantClient(associationId);
    clientCache.set(associationId, db);
  }
  return { db, associationId };
}
