import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Hette tidigare middleware.ts. Next 16 har döpt om konventionen till proxy:
 * middleware-filen ger en deprecation-varning, och finns båda filerna samtidigt
 * avbryts bygget. Next letar efter en export som heter `proxy` eller en
 * default-export.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Bara där servern läser sessionen. De publika sidorna är statiska och
   * cachade – där förnyar webbläsarklienten sin egen session, och ingen
   * funktion behöver väckas. /felanmalan för inskicket (server action:en
   * kopplar ärendet till kontot).
   */
  matcher: [
    "/admin/:path*",
    "/medlem/:path*",
    "/logga-in",
    "/felanmalan",
    "/api/me",
    "/dokument/:id/ladda-ner",
  ],
};
