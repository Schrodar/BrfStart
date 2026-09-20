/**
 * =============================================================================
 * NAVIGATION – menyns struktur (grupper och länkar).
 * =============================================================================
 * Föreningens uppgifter (namn, adress, kontakt, org.nr) ligger i databasen och
 * redigeras under Admin → Föreningsinfo; logotyp och sajtadress ligger i
 * src/config/siteConfig.ts. Här finns bara navigationens uppbyggnad, som
 * sällan skiljer sig mellan föreningar.
 *
 * navGroups är ENDA källan till strukturen. Lådan (nav-drawer.tsx) och
 * sajtkartan i footern läser båda härifrån, så att de två inte kan glida isär.
 *
 * Grupperna utgår från vem som frågar: boende söker nyheter och felanmälan,
 * medan stadgar och årsredovisningar efterfrågas av både boende och köpare och
 * därför ligger under "Om föreningen" snarare än bakom "Köpa bostad".
 */

/**
 * Grupperad navigation för sidomenyn (accordion). Medlemslänken ("Mina sidor"
 * / "Admin") läggs till dynamiskt i gruppen "För boende" av NavDrawer när någon
 * är inloggad. Logga in/ut ligger i headern (auth-button.tsx), inte här.
 */
export const navGroups = [
  {
    id: "boende",
    title: "För boende",
    items: [
      { href: "/nyheter", label: "Nyheter" },
      { href: "/dokument", label: "Dokument" },
      { href: "/felanmalan", label: "Felanmälan" },
      { href: "/kontakt", label: "Kontakt" },
    ],
  },
  {
    id: "om",
    title: "Om föreningen",
    items: [
      { href: "/om-foreningen", label: "Om föreningen" },
      { href: "/styrelse", label: "Styrelse" },
      { href: "/stadgar", label: "Stadgar" },
      { href: "/arsredovisningar", label: "Årsredovisningar" },
      { href: "/fastigheten", label: "Fastigheten" },
    ],
  },
  {
    id: "kopa",
    title: "Köpa bostad",
    items: [
      { href: "/till-salu", label: "Till salu" },
      { href: "/for-maklare", label: "För mäklare" },
      { href: "/ekonomi", label: "Föreningens ekonomi" },
    ],
  },
] as const;
