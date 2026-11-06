import { headers } from "next/headers";

/**
 * Enkel spärr mot gissning, räknad i minnet. Varje förening kör i en egen
 * container, så räkningen gäller per sajt. Den nollställs vid en omstart, vilket
 * räcker mot den som provar koder i en loop.
 */

const failures = new Map<string, number[]>();

/** Rensar gamla nycklar då och då, så att kartan inte växer utan gräns. */
const SWEEP_AT = 5_000;

function recent(key: string, windowMs: number, now: number): number[] {
  return (failures.get(key) ?? []).filter((t) => now - t < windowMs);
}

/** Har nyckeln nått gränsen för misslyckade försök inom fönstret? */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const list = recent(key, windowMs, now);
  if (list.length === 0) failures.delete(key);
  else failures.set(key, list);
  return list.length >= limit;
}

/** Räknar ett misslyckat försök. */
export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  if (failures.size >= SWEEP_AT) {
    for (const k of failures.keys()) {
      if (recent(k, windowMs, now).length === 0) failures.delete(k);
    }
  }
  const list = recent(key, windowMs, now);
  list.push(now);
  failures.set(key, list);
}

/**
 * Besökarens IP-adress. Bakom proxyn i Coolify står den först i
 * x-forwarded-for.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "okänd"
  );
}
