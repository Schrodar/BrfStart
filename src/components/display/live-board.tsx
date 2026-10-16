"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { activeNotices, type BoardData, type BoardNotice } from "@/lib/board";
import { BoardView } from "./board-view";

const ROTATE_MS = 15_000;

/**
 * Tavlan som den beter sig på en skärm: mäter hur höga anslagen blir och packar
 * dem i sidor som får plats, och bläddrar mellan sidorna. Används av skärmen
 * (DisplayBoard) och av förhandsvisningen.
 *
 * Mätningen gör att samma tavla fungerar på stående och liggande skärmar, med
 * korta och långa texter, med och utan bild – inget kort trycks ihop eller
 * klipps så länge det får plats ensamt.
 */
export function LiveBoard({ data, now }: { data: BoardData; now: Date }) {
  const [area, setArea] = useState<HTMLDivElement | null>(null);
  const [measure, setMeasure] = useState<HTMLDivElement | null>(null);
  const [fitted, setFitted] = useState<string[][] | null>(null);
  const [page, setPage] = useState(0);

  const active = activeNotices(data.notices, now);
  // Ändras bara när anslagen eller deras innehåll gör det, inte varje minut.
  const activeKey = active.map((n) => `${n.id}:${n.title.length}:${n.body.length}:${!!n.imageUrl}`).join("|");

  const fit = useCallback(() => {
    if (!area || !measure) return;
    const style = getComputedStyle(area);
    const available =
      area.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const gap = parseFloat(style.rowGap) || 0;

    const result: string[][] = [];
    let current: string[] = [];
    let used = 0;
    for (const el of Array.from(measure.children) as HTMLElement[]) {
      const id = el.dataset.id;
      if (!id) continue;
      const height = el.offsetHeight;
      const needed = current.length > 0 ? used + gap + height : height;
      if (current.length > 0 && needed > available) {
        result.push(current);
        current = [id];
        used = height;
      } else {
        current.push(id);
        used = needed;
      }
    }
    if (current.length > 0) result.push(current);

    setFitted((prev) => (JSON.stringify(prev) === JSON.stringify(result) ? prev : result));
  }, [area, measure]);

  // Mät före första målningen, och igen när anslagen ändras.
  useLayoutEffect(() => {
    fit();
  }, [fit, activeKey]);

  // …och när ytan ändrar storlek eller typsnitten har laddats.
  useEffect(() => {
    if (!area) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(area);
    document.fonts?.ready.then(() => fit());
    return () => observer.disconnect();
  }, [area, fit]);

  const byId = new Map(active.map((n) => [n.id, n]));
  const pages: BoardNotice[][] | undefined = fitted
    ?.map((ids) => ids.map((id) => byId.get(id)).filter((n): n is BoardNotice => !!n))
    .filter((p) => p.length > 0);

  // Bläddra mellan sidorna när allt inte får plats på en gång.
  const pageCount = pages?.length ?? 1;
  useEffect(() => {
    if (pageCount <= 1) {
      setPage(0);
      return;
    }
    const id = setInterval(() => setPage((p) => (p + 1) % pageCount), ROTATE_MS);
    return () => clearInterval(id);
  }, [pageCount]);

  return (
    <div className="h-screen">
      <BoardView
        data={data}
        now={now}
        page={page}
        pages={pages}
        areaRef={setArea}
        measureRef={setMeasure}
      />
    </div>
  );
}

/** Styrelsens förhandsvisning: samma tavla med egen klocka, utan hämtning. */
export function BoardPreview({ data }: { data: BoardData }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Ett tick vid varje ny minut, som på skärmen.
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(new Date());
      timeout = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    tick();
    return () => clearTimeout(timeout);
  }, []);
  if (!now) return <div className="h-screen bg-background" />;
  return <LiveBoard data={data} now={now} />;
}
