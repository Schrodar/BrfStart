import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { getBoardData, getBuildingById } from "@/lib/data";
import { BoardPreview } from "@/components/display/live-board";

/**
 * Styrelsens förhandsvisning av tavlan, med samma innehåll som en skärm i det
 * valda huset (?hus=<id>) skulle få. Ligger under /tavla för att få tavlans
 * helskärmslayout och storlekar.
 */

export const dynamic = "force-dynamic";

export default async function BoardPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ hus?: string }>;
}) {
  await requireAdmin();
  const { hus } = await searchParams;
  const building = hus ? await getBuildingById(hus) : null;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const data = await getBoardData(
    building ? { id: building.id, name: building.name, address: building.address } : null,
    `${proto}://${host}`,
  );

  return (
    <>
      <style>{`body{cursor:auto}`}</style>
      <BoardPreview data={data} />
    </>
  );
}
