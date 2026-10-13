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

  const data = await getBoardData(
    building ? { id: building.id, name: building.name, address: building.address } : null,
  );

  return (
    <>
      <style>{`body{cursor:auto}`}</style>
      <BoardPreview data={data} />
    </>
  );
}
