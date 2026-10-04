/**
 * Samlad ingång till datalagret. Importera härifrån i sidor/komponenter:
 *   import { getPublishedNews } from "@/lib/data";
 *
 * Backas av Supabase Postgres via Prisma (src/lib/prisma.ts). Modulerna mappar
 * Prisma-rader till domäntyperna i src/lib/types.ts, så importvägen och
 * funktionssignaturerna är desamma som i den tidigare mock-versionen.
 */

export * from "./apartments";
export * from "./association";
export * from "./board";
export * from "./buildings";
export * from "./documents";
export * from "./economy";
export * from "./invitations";
export * from "./maintenance";
export * from "./members";
export * from "./news";
export * from "./support";
