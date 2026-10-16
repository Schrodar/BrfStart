"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/siteConfig";
import {
  BOARD_BUILD,
  DEFAULT_REFRESH_MINUTES,
  isNight,
  type BoardData,
} from "@/lib/board";
import { LiveBoard } from "./live-board";

/**
 * Trapphustavlan som den körs på skärmen.
 *
 * Huvudregeln: tavlan ska aldrig visa att nätet är borta. Misslyckas en
 * hämtning fortsätter den visa det senaste den fick. Det senaste svaret sparas
 * också i localStorage, och service workern (public/tavla/sw.js) sparar sidan,
 * skripten, typsnitten och bilderna – så att en skärm som startar om utan nät
 * ändå visar tavlan direkt.
 *
 * Hämtningarna är glesa med flit (styrelsens val: varje timme eller en gång om
 * dagen), eftersom varje hämtning är ett funktionsanrop hos Netlify. Nattetid,
 * när skärmen ändå är svart, hämtar den inte alls – den hämtar direkt när den
 * tänds igen.
 *
 * Allt tidsberoende (klockan, vilka anslag som gäller, nattläget) räknas ut här
 * med skärmens egen klocka. Klockan hämtas aldrig från servern: Pi:n ställer
 * sin systemklocka mot internettid (NTP) och går på sitt RTC-batteri utan nät.
 */

const STORAGE_KEY = "tavla:data";
const RELOADED_KEY = "tavla:reloadedAt";

const FETCH_TIMEOUT_MS = 15_000;
/** Nytt försök efter en misslyckad hämtning – aldrig senare än intervallet. */
const RETRY_MINUTES = 15;
/** Så många 404 i rad innan en skärm med innehåll ger upp (avaktiverad). */
const INVALID_AFTER = 3;
/** Minsta tid mellan två automatiska omladdningar – skydd mot en loop. */
const RELOAD_GUARD_MS = 10 * 60_000;

function readCache(): BoardData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BoardData) : null;
  } catch {
    return null;
  }
}

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Fullt eller blockerat – tavlan fungerar ändå så länge den är igång.
  }
}

/** Laddar om sidan, men aldrig oftare än var tionde minut. */
function reloadOnce() {
  try {
    const last = Number(localStorage.getItem(RELOADED_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return;
    localStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
}

/** Millisekunder till nästa hela minut (plus en liten marginal). */
function msToNextMinute(): number {
  return 60_000 - (Date.now() % 60_000) + 50;
}

export function DisplayBoard({ token }: { token: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  // Schemaläggningen läser och skriver refs, så att den inte startas om när
  // innehållet byts.
  const dataRef = useRef<BoardData | null>(null);
  const nextFetchAt = useRef(0);
  const inFlight = useRef(false);
  const wasNight = useRef(false);
  const notFound = useRef(0);

  useEffect(() => {
    const show = (next: BoardData | null) => {
      dataRef.current = next;
      setData(next);
    };

    const refreshMs = () =>
      (dataRef.current?.refreshMinutes ?? DEFAULT_REFRESH_MINUTES) * 60_000;
    const retryMs = () => Math.min(refreshMs(), RETRY_MINUTES * 60_000);

    async function load() {
      inFlight.current = true;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch("/api/tavla", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (res.status === 404) {
          // En ny skärm med fel adress ska synas direkt. En skärm som redan
          // visar något släpper det först efter flera svar i rad – då har den
          // avaktiverats eller fått ny token.
          notFound.current += 1;
          if (!dataRef.current || notFound.current >= INVALID_AFTER) {
            store(STORAGE_KEY, null);
            show(null);
            setInvalid(true);
          }
          nextFetchAt.current = Date.now() + retryMs();
          return;
        }
        if (!res.ok) {
          nextFetchAt.current = Date.now() + retryMs();
          return;
        }
        const next = (await res.json()) as BoardData;
        notFound.current = 0;
        setInvalid(false);
        show(next);
        store(STORAGE_KEY, JSON.stringify(next));
        nextFetchAt.current = Date.now() + refreshMs();
        // Ny deploy: hämta den nya sidan när servern bevisligen svarar.
        if (next.build !== BOARD_BUILD) reloadOnce();
      } catch {
        // Inget nät eller timeout: behåll det som visas och försök snart igen.
        nextFetchAt.current = Date.now() + retryMs();
      } finally {
        clearTimeout(timer);
        inFlight.current = false;
      }
    }

    // Start: visa det sparade direkt. Startar skärmen nattetid med sparat
    // innehåll (t.ex. Pi:ns omstart kl. 04.15) väntar hämtningen till morgonen.
    const cached = readCache();
    if (cached) show(cached);
    const startsAtNight = !!cached && isNight(cached.night, new Date());
    wasNight.current = startsAtNight;
    nextFetchAt.current = startsAtNight ? Number.POSITIVE_INFINITY : 0;

    // Ett tick vid varje ny minut: klockan byter minut i rätt sekund, och
    // samma tick avgör nattläget och om det är dags att hämta.
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      // Nästa tick schemaläggs först – klockan får aldrig stanna, inte ens om
      // något nedan skulle kasta ett fel.
      timeout = setTimeout(tick, msToNextMinute());

      const t = new Date();
      setNow(t);

      const night = dataRef.current ? isNight(dataRef.current.night, t) : false;
      if (wasNight.current && !night) nextFetchAt.current = 0; // morgon: hämta direkt
      wasNight.current = night;

      if (!night && !inFlight.current && Date.now() >= nextFetchAt.current) load();
    };
    tick();
    return () => clearTimeout(timeout);
  }, [token]);

  // Service workern gör att sidan startar även utan nät.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/tavla/sw.js", { scope: "/tavla/" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Sidan och det den redan har laddat hämtades innan workern fanns –
        // be den spara dem nu.
        const urls = [
          window.location.href,
          ...performance
            .getEntriesByType("resource")
            .map((e) => e.name)
            .filter((u) => !u.includes("/api/")),
        ];
        reg.active?.postMessage({ type: "precache", urls });
      })
      .catch(() => {});
  }, []);

  if (!now) return <div className="h-screen bg-background" />;

  if (data && isNight(data.night, now)) {
    return <div className="h-screen bg-black" />;
  }

  if (!data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-[2rem] bg-background">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={siteConfig.logo.src} alt="" className="h-[8rem] w-auto opacity-80" />
        {invalid ? (
          <p className="text-[1.2rem] text-muted">Tavlan är inte aktiverad.</p>
        ) : null}
      </div>
    );
  }

  return <LiveBoard data={data} now={now} />;
}
