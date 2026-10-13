"use client";

import { useEffect, useState } from "react";
import { activeNotices, type BoardData } from "@/lib/board";
import { BoardView, noticePages, PAGE_CAPACITY } from "./board-view";

const TICK_MS = 10_000;
const ROTATE_MS = 15_000;

/**
 * Tavlan som den beter sig på en skärm: väljer hur många anslag som får plats
 * efter om skärmen står eller ligger, och bläddrar mellan sidorna. Används av
 * skärmen (DisplayBoard) och av förhandsvisningen.
 */
export function LiveBoard({ data, now }: { data: BoardData; now: Date }) {
  const [landscape, setLandscape] = useState(false);
  const [page, setPage] = useState(0);

  // Liggande skärm har mindre höjd för anslagen – färre per sida.
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const capacity = landscape ? PAGE_CAPACITY.landscape : PAGE_CAPACITY.portrait;

  // Bläddra mellan anslagen när de inte får plats på en gång.
  const pageCount = noticePages(activeNotices(data.notices, now), capacity).length;
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
      <BoardView data={data} now={now} page={page} capacity={capacity} />
    </div>
  );
}

/** Styrelsens förhandsvisning: samma tavla med egen klocka, utan hämtning. */
export function BoardPreview({ data }: { data: BoardData }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);
  if (!now) return <div className="h-screen bg-background" />;
  return <LiveBoard data={data} now={now} />;
}
