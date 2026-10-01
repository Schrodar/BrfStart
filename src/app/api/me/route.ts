import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Den inloggades egna uppgifter, för headern och felanmälan. De publika
 * sidorna renderas statiskt och cachas, så de vet inte vem som tittar – i
 * stället frågar webbläsaren här, och bara när det finns en session.
 *
 * Svaret gäller bara den här besökaren och får aldrig cachas.
 */
export async function GET() {
  const user = await getCurrentUser();
  const member = user
    ? {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      }
    : null;

  return NextResponse.json(
    { member },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
