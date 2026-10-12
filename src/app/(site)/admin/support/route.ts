import { NextResponse } from "next/server";
import { redeemSupportToken, SUPPORT_COOKIE } from "@/lib/data/support";

/**
 * Löser in engångslänken från plattformspanelen och startar ett supportläge.
 *
 * Token ligger i adressen och byts därför omedelbart mot en cookie: svaret är en
 * redirect till /admin, så att token inte blir kvar i adressfältet, historiken
 * eller i en referrer-header (Referrer-Policy: no-referrer).
 *
 * Allt som inte stämmer ger 404 utan förklaring – okänd token, redan använd,
 * utgången, avslutad eller skapad för en annan förening. Att svaren är
 * likadana gör att inget läcker om vilka sessioner som finns.
 */

export const dynamic = "force-dynamic";

const NO_REFERRER = { "Referrer-Policy": "no-referrer" } as const;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const session = await redeemSupportToken(token);

  if (!session) {
    return new NextResponse("Hittades inte", {
      status: 404,
      headers: NO_REFERRER,
    });
  }

  const response = NextResponse.redirect(new URL("/admin", request.url), {
    headers: NO_REFERRER,
  });
  response.cookies.set(SUPPORT_COOKIE, session.cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // Host-only: inget domain-attribut, så cookien följer inte med till
    // subdomäner. Går ut när sessionen går ut.
    expires: session.expiresAt,
  });
  return response;
}
