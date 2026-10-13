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
  // Chromium erbjuder annars att översätta sidan när skärmens språk inte är
  // svenska – en ruta som ingen kan stänga på en skärm utan mus.
  other: { google: "notranslate" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Ingen rullning och ingen rullningslist – tavlan är alltid exakt en skärm. */}
      <style>{`html{font-size:1.8vmin;scrollbar-gutter:auto;overflow:hidden}body{overflow:hidden;cursor:none}`}</style>
      {children}
    </>
  );
}
