import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { siteConfig } from "@/config/siteConfig";
import { getAssociationProfile } from "@/lib/data";
import { shortNameOf } from "@/lib/utils";
import "./globals.css";

// Fraunces (rubriker i menyn) + Manrope (brödtext/länkar). Exponeras som
// CSS-variabler och används via .font-display / .font-body i globals.css.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

/**
 * De publika sidorna renderas en gång och serveras sedan ur cachen. Layouten
 * läser därför inte inloggningen – headern gör det i webbläsaren (se
 * useCurrentMember). När styrelsen ändrar något byggs berörda sidor om via
 * revalidatePath i admin-actions; revalidate här är ett säkerhetsnät som
 * förnyar en sida i bakgrunden inom tio minuter om en ändring skulle missas.
 */
export const revalidate = 600;

/** Titel och beskrivning byggs av föreningens uppgifter i databasen. */
export async function generateMetadata(): Promise<Metadata> {
  const association = await getAssociationProfile();
  const place = association.city ? ` i ${association.city}` : "";
  return {
    metadataBase: new URL(siteConfig.seo.siteUrl),
    title: {
      default: association.name,
      template: `%s | ${shortNameOf(association)}`,
    },
    description: `${association.name}${place}. Här hittar du information för boende, mäklare och besökare.`,
    icons: { icon: siteConfig.logo.favicon },
  };
}

/**
 * Bara dokumentets skal. Sajtens header och footer ligger i (site)/layout.tsx,
 * så att trapphustavlan (/tavla) kan ta hela skärmen utan dem.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: trapphustavlan sätter translate="no" på <html>
    // med ett skript innan React tar över (se tavla/layout.tsx). Gäller bara
    // attributen på själva <html>-taggen.
    <html
      lang="sv"
      className={`${fraunces.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body className="theme-site">{children}</body>
    </html>
  );
}
