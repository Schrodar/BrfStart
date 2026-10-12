import { DisplayBoard } from "@/components/display/display-board";

/**
 * Skärmens sida. Den läser ingenting på servern – skärmen hämtar sitt innehåll
 * själv från /api/tavla – så att samma skal kan serveras ur service workerns
 * cache när nätet ligger nere.
 */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <DisplayBoard token={token} />;
}
