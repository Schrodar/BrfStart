import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDocumentForDownload } from "@/lib/data";
import { BUCKET_DOCUMENTS, getSignedUrl } from "@/lib/storage";

/**
 * Nedladdning av föreningsdokument.
 *
 * Filerna ligger i en PRIVAT bucket och nås bara via en kortlivad signerad URL
 * som genereras här, efter att behörigheten kontrollerats. Signerade URL:er får
 * aldrig renderas i dokumentlistan – de går ut, och en cachad sida skulle ge
 * döda länkar. Den här routen kontrollerar istället vid varje klick.
 *
 * Uppslaget är tenant-scopat (se lib/tenant), så ett id som tillhör en annan
 * förening ger 404 utan extra kontroll här.
 *
 * Saknad behörighet ger 404 och inte 401/redirect: annars går det att räkna ut
 * vilka interna dokument som finns genom att prova id:n.
 */

export const dynamic = "force-dynamic";

function notFound() {
  return new NextResponse("Hittades inte", { status: 404 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const doc = await getDocumentForDownload(id);
  if (!doc || !doc.storagePath) return notFound();

  if (doc.visibility === "member") {
    const user = await getCurrentUser();
    // Godkänd krävs även för admins – rollen ensam räcker inte.
    const allowed = user?.status === "approved";
    if (!allowed) return notFound();
  }

  const url = await getSignedUrl(BUCKET_DOCUMENTS, doc.storagePath);
  if (!url) return new NextResponse("Filen kunde inte hämtas", { status: 502 });

  return NextResponse.redirect(url);
}
