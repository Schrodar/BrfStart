/**
 * =============================================================================
 * SITECONFIG – det som hör till själva sajten, inte till föreningen.
 * =============================================================================
 * Föreningens uppgifter – namn, kortnamn, org.nr, adress, kontakt och
 * förvaltare – ligger i databasen och redigeras av styrelsen under
 * Admin → Föreningsinfo → Namn och kontakt. Läs dem med getAssociationProfile()
 * från "@/lib/data", aldrig härifrån.
 *
 * Här ligger det som följer med deployen:
 *
 *   1. Logotypfilerna i public/images/.
 *   2. Interna nyckelrutter.
 *   3. Sajtens adress (för absoluta länkar i metadata och mejl).
 *
 *   import { siteConfig } from "@/config/siteConfig";
 *
 * Navigationens struktur (menygrupper/länkar) ligger i src/config/site.ts.
 * Färger/typsnitt ändras i src/app/globals.css.
 */

export const siteConfig = {
  /** Kort beskrivning – visas som ingress i sidomenyn. */
  description: "Information för boende, besökare och blivande medlemmar.",

  hero: {
    /**
     * Bakgrundsfilm i heron på startsidan, t.ex. "/videos/hero.mp4" eller en
     * adress till en CDN. Sätts per deploy i NEXT_PUBLIC_HERO_VIDEO.
     *
     * Ligger INTE i repot: filmen är föreningens egen (eller licensierad), och
     * en lånad fil får sällan spridas vidare i ett publikt repo. Utan film
     * visar heron sin mörka bakgrund, vilket fungerar lika bra.
     */
    video: process.env.NEXT_PUBLIC_HERO_VIDEO ?? "",
  },

  logo: {
    /** Primär logotyp (mörk, för ljus bakgrund). */
    src: "/images/logo.svg",
    /** Ljus/inverterad logotyp för mörka ytor. Lämna tom om den saknas. */
    lightSrc: "/images/logo-light.svg",
    /** Favicon (SVG eller .ico). */
    favicon: "/images/logo.svg",
  },

  /** Interna nyckelrutter (används av knappar/länkar). */
  links: {
    contact: "/kontakt",
    faultReport: "/felanmalan",
    login: "/logga-in",
  },

  seo: {
    /** Sajtens adress – bas för absoluta länkar i metadata och mejl. */
    siteUrl: "https://www.exempelgarden.se",
  },
} as const;

export type SiteConfig = typeof siteConfig;
