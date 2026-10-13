"use client";

import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/config/siteConfig";
import { BOARD_BUILD, isNight, type BoardData } from "@/lib/board";
import { LiveBoard } from "./live-board";

/**
 * Trapphustavlan som den körs på skärmen.
 *
 * Huvudregeln: tavlan ska aldrig visa att nätet är borta. Den hämtar nytt
 * innehåll varje minut, och misslyckas det fortsätter den visa det senaste den
 * fick. Det senaste svaret sparas också i localStorage, och service workern
 * (public/tavla/sw.js) sparar sidan, skripten, typsnitten och bilderna – så att
 * en skärm som startar om utan nät ändå visar tavlan direkt.
 *
 * Allt tidsberoende (vilka anslag som gäller, nattläge, klockan) räknas ut här
 * med skärmens egen klocka och fortsätter därför fungera offline.
 */

const STORAGE_KEY = "tavla:data";
const RELOADED_KEY = "tavla:reloadedAt";
const NIGHTLY_KEY = "tavla:nightly";

const POLL_MS = 60_000;
const FETCH_TIMEOUT_MS = 15_000;
const TICK_MS = 10_000;
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

export function DisplayBoard({ token }: { token: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const lastOk = useRef(0);
  const hasData = useRef(false);

  // Hämtning: cachen först, sedan servern varje minut.
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      hasData.current = true;
      setData(cached);
    }

    let notFound = 0;
    async function load() {
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
          notFound += 1;
          if (!hasData.current || notFound >= INVALID_AFTER) {
            hasData.current = false;
            store(STORAGE_KEY, null);
            setData(null);
            setInvalid(true);
          }
          return;
        }
        if (!res.ok) return;
        const next = (await res.json()) as BoardData;
        notFound = 0;
        lastOk.current = Date.now();
        hasData.current = true;
        setInvalid(false);
        setData(next);
        store(STORAGE_KEY, JSON.stringify(next));
        // Ny deploy: hämta den nya sidan när servern bevisligen svarar.
        if (next.build !== BOARD_BUILD) reloadOnce();
      } catch {
        // Inget nät eller timeout: behåll det som visas.
      } finally {
        clearTimeout(timer);
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [token]);

  // Klockan, och en omladdning per natt mot minnesläckor i webbläsaren.
  useEffect(() => {
    const tick = () => {
      const t = new Date();
      setNow(t);
      const today = t.toDateString();
      const isReloadWindow = t.getHours() === 3 && t.getMinutes() >= 30;
      const online = Date.now() - lastOk.current < 3 * 60_000;
      if (isReloadWindow && online) {
        let done = false;
        try {
          done = localStorage.getItem(NIGHTLY_KEY) === today;
        } catch {
          done = true;
        }
        if (!done) {
          store(NIGHTLY_KEY, today);
          window.location.reload();
        }
      }
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, []);

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
