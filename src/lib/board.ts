/**
 * Det trapphustavlan får från /api/tavla, och de tidsregler skärmen räknar ut
 * själv. Filen importeras av både servern och skärmens klientkod, så den får
 * inte dra in något serverspecifikt.
 *
 * Allt tidsberoende avgörs på skärmen med dess egen klocka – vilka anslag som
 * gäller just nu och om det är natt – så att tavlan gör rätt även när nätet
 * ligger nere i timmar.
 */

export interface BoardNotice {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  pinned: boolean;
}

export interface BoardNews {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string | null;
}

export interface BoardContact {
  label: string;
  name: string;
  phone: string;
  note: string;
}

export interface BoardData {
  /** Bygget som svarade. Skiljer det sig från skärmens laddar den om sig. */
  build: string;
  generatedAt: string;
  association: { name: string; street: string; city: string };
  building: { name: string; address: string } | null;
  notices: BoardNotice[];
  news: BoardNews[];
  contacts: BoardContact[];
  night: { start: string; end: string };
  /** Minuter till nästa hämtning – styrelsens val under Trapphustavlor. */
  refreshMinutes: number;
}

/** Byggets stämpel, satt i next.config.ts. Samma på server och klient. */
export const BOARD_BUILD = process.env.NEXT_PUBLIC_BUILD_STAMP ?? "dev";

/**
 * Hur ofta skärmarna får hämta nytt innehåll. Medvetet glest: anslagen ändras
 * sällan, och varje hämtning är en databasfråga på en server som delas med
 * andra föreningar.
 */
export const REFRESH_OPTIONS = [
  { minutes: 60, label: "Varje timme" },
  { minutes: 1440, label: "En gång om dagen" },
] as const;

export const DEFAULT_REFRESH_MINUTES = 1440;

/** Ett okänt värde blir standardvärdet – aldrig tätare än något av valen. */
export function normalizeRefresh(value: number): number {
  return REFRESH_OPTIONS.some((o) => o.minutes === value) ? value : DEFAULT_REFRESH_MINUTES;
}

/** Anslagen som gäller vid tidpunkten `now`. */
export function activeNotices(notices: BoardNotice[], now: Date): BoardNotice[] {
  const t = now.getTime();
  return notices.filter(
    (n) =>
      new Date(n.startsAt).getTime() <= t &&
      (!n.endsAt || new Date(n.endsAt).getTime() > t),
  );
}

function minutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Om skärmen ska vara svart. Perioden får gå över midnatt (23:00–06:00). */
export function isNight(night: BoardData["night"], now: Date): boolean {
  const start = minutes(night.start);
  const end = minutes(night.end);
  if (start === null || end === null || start === end) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return start < end ? t >= start && t < end : t >= start || t < end;
}

/** Nattens längd i minuter (0 om skärmen aldrig släcks). */
export function nightMinutes(night: BoardData["night"]): number {
  const start = minutes(night.start);
  const end = minutes(night.end);
  if (start === null || end === null || start === end) return 0;
  return (end - start + 1440) % 1440;
}
