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
      className={cn(
        "flex h-full w-full flex-col overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      {/* Rubrik: förening, hus och klocka */}
      <header className="flex items-end justify-between gap-8 bg-moss px-[3rem] pb-[2.2rem] pt-[2.6rem] text-bone">
        <div className="min-w-0">
          <p className="text-[1.05rem] font-semibold uppercase tracking-[0.2em] text-bone/70">
            {data.building?.name ?? "Välkommen"}
          </p>
          <h1 className="font-display mt-[0.6rem] text-[3.2rem] leading-[1.05]">
            {data.association.name}
          </h1>
          {address ? <p className="mt-[0.6rem] text-[1.4rem] text-bone/80">{address}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-[4.6rem] leading-none tabular-nums">
            {timeFmt.format(now)}
          </p>
          <p className="mt-[0.6rem] text-[1.3rem] text-bone/80 first-letter:uppercase">
            {dateFmt.format(now)}
          </p>
        </div>
      </header>

      {/*
        Stående skärm: allt i en kolumn – anslag, nyheter, kontakter.
        Liggande skärm: anslagen till vänster, resten i en kolumn till höger,
        så att anslagen får hela höjden.
      */}
      <div className="flex min-h-0 flex-1 flex-col landscape:flex-row">
        {/* Anslag */}
        <main className="flex min-h-0 flex-1 flex-col px-[3rem] pt-[2.4rem] landscape:pb-[2.4rem]">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[1.05rem] font-semibold uppercase tracking-[0.2em] text-moss">
              Anslag
            </h2>
            {pages.length > 1 ? (
              <div className="flex gap-[0.5rem]" aria-hidden>
                {pages.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-[0.6rem] w-[0.6rem] rounded-full transition-colors duration-700",
                      i === page % pages.length ? "bg-moss" : "bg-line",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {current.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-display text-[2rem] text-muted">Inga aktuella anslag just nu.</p>
            </div>
          ) : (
            // Korten trycks aldrig ihop – får de inte plats klipps det sista
            // hellre nertill än att texten i alla blir oläslig.
            <div
              key={page}
              ref={areaRef}
              // Lite luft runt korten (som tas tillbaka med negativ marginal), så
              // att deras skugga inte klipps i kanten.
              className="board-fade relative -mx-[0.6rem] mt-[0.8rem] flex min-h-0 flex-1 flex-col gap-[1.4rem] overflow-hidden px-[0.6rem] pb-[0.8rem] pt-[0.6rem]"
            >
              {current.map((n) => (
                <NoticeCard key={n.id} notice={n} />
              ))}
              {measureRef ? (
                <div
                  ref={measureRef}
                  aria-hidden
                  className="pointer-events-none invisible absolute inset-x-[0.6rem] top-0 flex flex-col"
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

        <aside className="flex shrink-0 flex-col landscape:w-[34%] landscape:border-l landscape:border-line landscape:bg-bone">
          {data.news.length > 0 ? (
            <section className="mx-[3rem] mt-[1.6rem] border-t border-line pb-[1.6rem] pt-[1.4rem] landscape:mx-[2.4rem] landscape:mt-[2.4rem] landscape:border-t-0 landscape:pt-0">
              <h2 className="text-[1.05rem] font-semibold uppercase tracking-[0.2em] text-moss">
                Nytt på webbplatsen
              </h2>
              <ul className="mt-[0.9rem] grid grid-cols-2 gap-[1.6rem] landscape:grid-cols-1 landscape:gap-[1.2rem]">
                {data.news.map((n) => (
                  <li key={n.id}>
                    <p className="font-display text-[1.5rem] leading-snug">{n.title}</p>
                    <p className="mt-[0.3rem] line-clamp-2 text-[1.1rem] text-muted">{n.excerpt}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="h-[1.6rem] landscape:hidden" />
          )}

          {/* Kontakter och QR-koder */}
          <footer className="flex items-stretch gap-[2.4rem] border-t border-line bg-bone px-[3rem] py-[2rem] landscape:mt-auto landscape:flex-col landscape:gap-[1.6rem] landscape:px-[2.4rem]">
            <dl className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-[2rem] gap-y-[1.2rem] landscape:flex-none">
              {data.contacts.map((c) => (
                <div key={c.label} className="min-w-0">
                  <dt className="text-[0.95rem] font-semibold uppercase tracking-[0.14em] text-moss">
                    {c.label}
                  </dt>
                  <dd
                    className={cn(
                      "mt-[0.2rem] font-semibold tabular-nums leading-tight",
                      // En e-postadress är för lång för telefonnumrets storlek.
                      c.phone.includes("@") ? "break-all text-[1.15rem]" : "text-[1.6rem]",
                    )}
                  >
                    {c.phone}
                  </dd>
                  {c.name || c.note ? (
                    <dd className="mt-[0.15rem] line-clamp-2 text-[1rem] text-muted">
                      {[c.name, c.note].filter(Boolean).join(" · ")}
                    </dd>
                  ) : null}
                </div>
              ))}
            </dl>
            <div className="flex shrink-0 gap-[1.6rem]">
              {data.qr.map((q) => (
                <figure key={q.label} className="flex w-[9rem] flex-col items-center">
                  <div
                    className="w-full rounded-[0.6rem] bg-white p-[0.6rem] [&>svg]:h-auto [&>svg]:w-full"
                    // SVG:n genereras på servern av qrcode-paketet ur sajtens egen adress.
                    dangerouslySetInnerHTML={{ __html: q.svg }}
                  />
                  <figcaption className="mt-[0.5rem] text-center text-[0.95rem] font-medium leading-tight">
                    {q.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function NoticeCard({ notice }: { notice: BoardNotice }) {
  return (
    <article
      className={cn(
        // Ramen ritas innanför kortet (border, inte ring) – en ring hamnar utanför
        // och klipps av anslagsytans overflow-hidden.
        "flex shrink-0 gap-[1.6rem] overflow-hidden rounded-[1.2rem] border-[0.2rem] bg-surface p-[1.6rem] shadow-[var(--card-shadow)]",
        notice.pinned ? "border-moss" : "border-transparent",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-x-[1rem] gap-y-[0.3rem]">
          {notice.pinned ? (
            <span className="rounded-full bg-moss px-[0.8rem] py-[0.15rem] text-[0.9rem] font-semibold uppercase tracking-[0.12em] text-bone">
              Viktigt
            </span>
          ) : null}
          {notice.endsAt ? (
            <span className="text-[1rem] text-muted">
              {/* endsAt är första ögonblicket då anslaget inte gäller – visa dagen innan. */}
              Gäller till och med{" "}
              {shortDateFmt.format(new Date(new Date(notice.endsAt).getTime() - 1))}
            </span>
          ) : null}
        </div>
        <h3 className="font-display mt-[0.5rem] text-[2.3rem] leading-tight">{notice.title}</h3>
        <p className="mt-[0.7rem] line-clamp-6 whitespace-pre-line text-[1.45rem] leading-relaxed">
          {notice.body}
        </p>
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
          className="aspect-[4/3] w-[38%] shrink-0 self-start rounded-[0.8rem] object-cover"
        />
      ) : null}
    </article>
  );
}
