import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TransitionProvider } from "@/components/page-transition/TransitionProvider";
import { PageTransition } from "@/components/page-transition/PageTransition";
import { getAssociationProfile, getSiteContent } from "@/lib/data";

/**
 * Header, innehåll och footer. Används av (site)/layout.tsx och av 404-sidan,
 * som ligger i roten och därför inte får sajtens layout på köpet.
 */
export async function SiteChrome({ children }: { children: React.ReactNode }) {
  const [siteContent, association] = await Promise.all([
    getSiteContent(),
    getAssociationProfile(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      {/*
        SiteHeader är inte sticky längre.
        På startsidan är den en helskärmshero. På övriga sidor är den en
        vanlig statisk toppheader. NavDrawer renderas via portal till body.
      */}
      <TransitionProvider>
        <SiteHeader
          association={association}
          heroTitle={siteContent.heroTitle}
          heroSubtitle={siteContent.heroSubtitle}
        />

        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>

        <SiteFooter association={association} />
      </TransitionProvider>
    </div>
  );
}
