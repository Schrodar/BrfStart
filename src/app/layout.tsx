import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { siteConfig } from "@/config/siteConfig";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TransitionProvider } from "@/components/page-transition/TransitionProvider";
import { PageTransition } from "@/components/page-transition/PageTransition";
import { getCurrentUser } from "@/lib/auth";
import { getAssociationProfile, getSiteContent } from "@/lib/data";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, siteContent, association] = await Promise.all([
    getCurrentUser(),
    getSiteContent(),
    getAssociationProfile(),
  ]);

  return (
    <html lang="sv" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="flex min-h-screen flex-col">
        {/*
          SiteHeader är inte sticky längre.
          På startsidan är den en helskärmshero. På övriga sidor är den en
          vanlig statisk toppheader. NavDrawer renderas via portal till body.
        */}
        <TransitionProvider>
          <SiteHeader
            user={user}
            association={association}
            heroTitle={siteContent.heroTitle}
            heroSubtitle={siteContent.heroSubtitle}
          />

          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>

          <SiteFooter association={association} />
        </TransitionProvider>
      </body>
    </html>
  );
}
