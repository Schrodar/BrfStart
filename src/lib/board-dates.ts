/**
 * Datum för anslag. Styrelsen väljer hela dagar ("visa från 12 oktober till och
 * med 14 oktober"), och dagarna gäller i svensk tid – servern kör i UTC, så ett
 * datumfält kan inte tolkas med serverns egen tidszon.
 */

const TZ = "Europe/Stockholm";

/** Hur många ms Stockholm ligger före UTC vid tidpunkten. */
function offsetAt(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return local - utcMs;
}

/** Midnatt svensk tid i början av dagen "YYYY-MM-DD". Null om datumet är ogiltigt. */
export function startOfDaySe(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;
  const guess = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // Två varv, så att dagar med sommartidsbyte blir rätt.
  let utc = guess - offsetAt(guess);
  utc = guess - offsetAt(utc);
  return new Date(utc);
}

/** Midnatt svensk tid i slutet av dagen – första ögonblicket då den inte gäller. */
export function endOfDaySe(dateStr: string): Date | null {
  const start = startOfDaySe(dateStr);
  if (!start) return null;
  // Nästa dags midnatt räknas om, så att 23- och 25-timmarsdygn blir rätt.
  const next = new Date(start.getTime() + 36 * 3_600_000);
  return startOfDaySe(dateStrSe(next));
}

/** "YYYY-MM-DD" för tidpunkten, i svensk tid. */
export function dateStrSe(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Sista dagen ett anslag med det här slutet visas ("till och med"). */
export function lastDaySe(endsAt: Date): string {
  return dateStrSe(new Date(endsAt.getTime() - 1));
}
