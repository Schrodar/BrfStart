import { SiteChrome } from "@/components/layout/site-chrome";

/** Sajtens alla sidor – publika, medlemmar och admin – med header och footer. */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteChrome>{children}</SiteChrome>;
}
