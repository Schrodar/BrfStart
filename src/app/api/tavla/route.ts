import { NextResponse } from "next/server";
import { getBoardData, getDisplayByToken } from "@/lib/data";

/**
 * Innehållet till en trapphustavla. Skärmen skickar sin token som
 * "Authorization: Bearer <token>" och hämtar igen varje minut.
 *
 * Allt som inte stämmer – saknad, okänd eller återkallad token – ger samma 404,
 * så att svaren inte avslöjar vilka skärmar som finns.
 */

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const display = await getDisplayByToken(token);
  if (!display) {
    return new NextResponse("Hittades inte", { status: 404, headers: NO_STORE });
  }

  const data = await getBoardData(display.building);
  return NextResponse.json(data, { headers: NO_STORE });
}
