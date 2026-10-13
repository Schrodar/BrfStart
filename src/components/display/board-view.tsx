import type { Ref } from "react";
import { activeNotices, type BoardData, type BoardNotice } from "@/lib/board";
import { cn } from "@/lib/utils";

/**
 * Själva tavlan – ren presentation. Används av skärmen (DisplayBoard) och av
 * förhandsvisningen i adminpanelen.
 *
 * Läses på två–tre meters håll av någon som går förbi: stora rubriker, korta
 * texter, inga hover-effekter. Storlekarna är i rem, och rem är satt efter
 * skärmens kortsida i tavla/layout.tsx.
 */

// Svensk tid uttryckligen: förhandsvisningen renderas på en server i UTC.
const TZ = "Europe/Stockholm";
const timeFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDateFmt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
});

/**
 * Grov sidindelning, när korten inte har mätts (första renderingen). Ett anslag
 * med bild räknas som två. Skärmen mäter sedan korten och packar sidorna efter
 * verklig höjd – se LiveBoard.
 */
const ROUGH_CAPACITY = 3;
const weight = (n: BoardNotice) => (n.imageUrl ? 2 : 1);

export function noticePages(
  notices: BoardNotice[],
  capacity: number = ROUGH_CAPACITY,
): BoardNotice[][] {
  const pages: BoardNotice[][] = [];
  let current: BoardNotice[] = [];
  let used = 0;
  for (const n of notices) {
    if (current.length > 0 && used + weight(n) > capacity) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(n);
    used += weight(n);
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

export function BoardView({
  data,
  now,
  page = 0,
  pages: fittedPages,
  areaRef,
  measureRef,
  className,
}: {
  data: BoardData;
  now: Date;
  /** Vilken sida av anslagen som visas, när de inte får plats på en. */
  page?: number;
  /** Sidorna packade efter uppmätt höjd. Saknas de används en grov indelning. */
  pages?: BoardNotice[][];
  /** Ytan anslagen visas i – dess höjd är vad som får plats på en sida. */
  areaRef?: Ref<HTMLDivElement>;
  /** Osynlig kolumn med alla aktuella anslag, för att mäta deras höjd. */
  measureRef?: Ref<HTMLDivElement>;
  className?: string;
}) {
  const active = activeNotices(data.notices, now);
  const pages = fittedPages && fittedPages.length > 0 ? fittedPages : noticePages(active);
  const current = pages.length > 0 ? pages[page % pages.length] : [];
  const address =
    data.building?.address ||
    [data.association.street, data.association.city].filter(Boolean).join(", ");

  return (
    <div
      // Inga översättningsförslag – se även tavla/layout.tsx.
      translate="no"
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-bone text-ink",
        className,
      )}
    >
      {/*
        Rubrik: förening, hus och klocka. Redaktionellt snarare än en färgad
        list – mörkgrönt bara i etiketten och den tunna linjen under.
      */}
      <header className="mx-[4rem] flex items-end justify-between gap-[3rem] border-b border-moss/30 pb-[2.4rem] pt-[3.4rem]">
        <div className="min-w-0">
          <p className="text-[0.95rem] font-semibold uppercase tracking-[0.24em] text-moss">
            {data.building?.name ?? "Välkommen"}
          </p>
          <h1 className="font-display mt-[0.9rem] text-[3.6rem] leading-[1.02] tracking-[-0.01em]">
            {data.association.name}
          </h1>
          {address ? (
            <p className="mt-[0.8rem] text-[1.25rem] text-ink/60">{address}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[4.4rem] leading-none tabular-nums">
            {timeFmt.format(now)}
          </p>
          <p className="mt-[0.8rem] text-[1.15rem] text-ink/60 first-letter:uppercase">
            {dateFmt.format(now)}
          </p>
        </div>
      </header>

      {/*
        Stående skärm: anslagen överst, nyheter och kontakt som två kort under.
        Liggande skärm: anslagen till vänster, korten i en spalt till höger, så
        att anslagen får hela höjden.
      */}
      <div className="flex min-h-0 flex-1 flex-col landscape:flex-row">
        {/* Anslag */}
        <main className="flex min-h-0 flex-1 flex-col px-[4rem] pt-[2.8rem] landscape:pb-[3rem] landscape:pr-[2rem]">
          <div className="flex items-center justify-between">
            <SectionLabel>Anslag</SectionLabel>
            {pages.length > 1 ? (
              <div className="flex gap-[0.6rem]" aria-hidden>
                {pages.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-[0.5rem] w-[0.5rem] rounded-full transition-colors duration-700",
                      i === page % pages.length ? "bg-moss" : "bg-line",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {current.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-display text-[1.9rem] italic text-ink/45">
                Inga aktuella anslag just nu.
              </p>
            </div>
          ) : (
            // Korten trycks aldrig ihop – får de inte plats klipps det sista
            // hellre nertill än att texten i alla blir oläslig.
            <div
              key={page}
              ref={areaRef}
              // Lite luft runt korten (som tas tillbaka med negativ marginal), så
              // att deras skugga inte klipps i kanten.
              className="board-fade relative -mx-[0.8rem] mt-[1rem] flex min-h-0 flex-1 flex-col gap-[1.8rem] overflow-hidden px-[0.8rem] pb-[1.2rem] pt-[0.8rem]"
            >
              {current.map((n) => (
                <NoticeCard key={n.id} notice={n} />
              ))}
              {measureRef ? (
                <div
                  ref={measureRef}
                  aria-hidden
                  className="pointer-events-none invisible absolute inset-x-[0.8rem] top-0 flex flex-col"
                >
                  {active.map((n) => (
                    <div key={n.id} data-id={n.id}>
                      <NoticeCard notice={n} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </main>

        {/* Nyheter och kontakt – lugna, separata kort */}
        <aside className="flex shrink-0 gap-[1.8rem] px-[4rem] pb-[3rem] pt-[1.2rem] landscape:w-[33%] landscape:flex-col landscape:pl-[2rem] landscape:pt-[2.8rem]">
          {data.news.length > 0 ? (
            <SideCard label="Nytt på webbplatsen">
              <ul className="space-y-[1.4rem]">
                {data.news.map((n) => (
                  <li key={n.id}>
                    <p className="font-display text-[1.45rem] leading-[1.25]">{n.title}</p>
                    <p className="mt-[0.4rem] line-clamp-2 text-[1.02rem] leading-[1.6] text-ink/60">
                      {n.excerpt}
                    </p>
                  </li>
                ))}
              </ul>
            </SideCard>
          ) : null}

          {data.contacts.length > 0 ? (
            <SideCard label="Kontakt">
              <dl className="space-y-[1.2rem]">
                {data.contacts.map((c) => (
                  <div key={c.label} className="min-w-0">
                    <dt className="text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-moss/80">
                      {c.label}
                    </dt>
                    <dd
                      className={cn(
                        "mt-[0.25rem] tabular-nums leading-tight",
                        // En e-postadress är för lång för telefonnumrets storlek.
                        c.phone.includes("@")
                          ? "break-words text-[1.1rem]"
                          : "text-[1.45rem] font-medium",
                      )}
                    >
                      {c.phone}
                    </dd>
                    {c.name || c.note ? (
                      <dd className="mt-[0.2rem] line-clamp-2 text-[0.95rem] leading-[1.5] text-ink/55">
                        {[c.name, c.note].filter(Boolean).join(" · ")}
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </SideCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/** Liten etikett med en kort linje framför – mörkgrönt i små doser. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-[0.9rem] text-[0.9rem] font-semibold uppercase tracking-[0.24em] text-moss">
      <span className="h-px w-[2.2rem] bg-moss/50" aria-hidden />
      {children}
    </h2>
  );
}

/** Kort i sidospalten: samma varma yta som anslagen, men lugnare. */
function SideCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 flex-1 rounded-[1.4rem] border border-line/70 bg-[#faf7f1]/80 px-[1.9rem] pb-[1.9rem] pt-[1.6rem] landscape:flex-none">
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-[1.3rem]">{children}</div>
    </section>
  );
}

function NoticeCard({ notice }: { notice: BoardNotice }) {
  return (
    <article
      className={cn(
        // Tunn ram innanför kortet och en mycket svag skugga. Ramen är lika tjock
        // på alla kort, så att höjden – och sidindelningen – inte beror på den.
        "flex shrink-0 gap-[2rem] overflow-hidden rounded-[1.6rem] border bg-[#faf7f1] p-[2.2rem] shadow-[0_1px_2px_rgb(41_43_39/0.03),0_14px_36px_-28px_rgb(41_43_39/0.22)]",
        notice.pinned ? "border-moss/50" : "border-line/70",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-[1.2rem] gap-y-[0.3rem] text-[0.9rem]">
          {notice.pinned ? (
            <span className="flex items-center gap-[0.5rem] font-semibold uppercase tracking-[0.2em] text-moss">
              <span className="h-[0.45rem] w-[0.45rem] rounded-full bg-moss" aria-hidden />
              Viktigt
            </span>
          ) : null}
          {notice.endsAt ? (
            <span className="text-ink/50">
              {/* endsAt är första ögonblicket då anslaget inte gäller – visa dagen innan. */}
              Gäller till och med{" "}
              {shortDateFmt.format(new Date(new Date(notice.endsAt).getTime() - 1))}
            </span>
          ) : null}
        </div>
        <h3 className="font-display mt-[0.8rem] text-[2.7rem] leading-[1.12] tracking-[-0.01em]">
          {notice.title}
        </h3>
        {notice.body ? (
          <p className="mt-[1rem] line-clamp-6 whitespace-pre-line text-[1.28rem] leading-[1.7] text-ink/75">
            {notice.body}
          </p>
        ) : null}
      </div>
      {notice.imageUrl ? (
        // Vanlig <img> med bildens fasta adress, så att service workern kan
        // spara den och visa den även utan nät.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={notice.imageUrl}
          alt=""
          // Fast format: med en kort text skulle bilden annars krympa till en
          // remsa lika hög som texten.
          className="aspect-[4/3] w-[36%] shrink-0 self-start rounded-[1rem] object-cover"
        />
      ) : null}
    </article>
  );
}
