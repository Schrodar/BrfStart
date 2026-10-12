import type { Metadata, Viewport } from "next";

/**
 * Trapphustavlan: helskärm i en låst webbläsare, utan sajtens header och
 * footer. Allt skalas efter skärmens kortsida (1rem = 1,8 % av den), så att
 * samma sida fungerar på en 24- och en 43-tumsskärm.
 */

export const metadata: Metadata = {
  title: "Trapphustavla",
  robots: { index: false, follow: false },
  // Adressen innehåller skärmens token. Den får inte följa med till
  // bildservern eller någon annan i en referrer-header.
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html{font-size:1.8vmin;scrollbar-gutter:auto}body{overflow:hidden;cursor:none}`}</style>
      {children}
    </>
  );
}
