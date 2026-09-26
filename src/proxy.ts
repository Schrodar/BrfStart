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
  matcher: [
    /*
     * Kör på alla sidor utom statiska filer och bilder.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
