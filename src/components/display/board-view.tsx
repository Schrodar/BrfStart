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

/** Ett anslag med bild tar ungefär dubbelt så mycket plats. */
const PAGE_CAPACITY = 4;
const weight = (n: BoardNotice) => (n.imageUrl ? 2 : 1);

/** Delar anslagen i sidor som får plats på skärmen samtidigt. */
export function noticePages(notices: BoardNotice[]): BoardNotice[][] {
  const pages: BoardNotice[][] = [];
  let current: BoardNotice[] = [];
  let used = 0;
  for (const n of notices) {
    if (current.length > 0 && used + weight(n) > PAGE_CAPACITY) {
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
  className,
}: {
  data: BoardData;
  now: Date;
  /** Vilken sida av anslagen som visas, när de inte får plats på en. */
  page?: number;
  className?: string;
}) {
  const pages = noticePages(activeNotices(data.notices, now));
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

      {/* Anslag */}
      <main className="flex min-h-0 flex-1 flex-col px-[3rem] pt-[2.4rem]">
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
          <div key={page} className="board-fade mt-[1.4rem] flex min-h-0 flex-1 flex-col gap-[1.4rem]">
            {current.map((n) => (
              <NoticeCard key={n.id} notice={n} />
            ))}
          </div>
        )}

        {data.news.length > 0 ? (
          <section className="mt-[1.6rem] border-t border-line pb-[1.6rem] pt-[1.4rem]">
            <h2 className="text-[1.05rem] font-semibold uppercase tracking-[0.2em] text-moss">
              Nytt på webbplatsen
            </h2>
            <ul className="mt-[0.9rem] grid grid-cols-2 gap-[1.6rem]">
              {data.news.map((n) => (
                <li key={n.id}>
                  <p className="font-display text-[1.5rem] leading-snug">{n.title}</p>
                  <p className="mt-[0.3rem] line-clamp-2 text-[1.1rem] text-muted">{n.excerpt}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="h-[1.6rem]" />
        )}
      </main>

      {/* Kontakter och QR-koder */}
      <footer className="flex items-stretch gap-[2.4rem] border-t border-line bg-bone px-[3rem] py-[2rem]">
        <dl className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-[2rem] gap-y-[1.2rem]">
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
    </div>
  );
}

function NoticeCard({ notice }: { notice: BoardNotice }) {
  return (
    <article
      className={cn(
        "flex min-h-0 gap-[1.6rem] overflow-hidden rounded-[1.2rem] bg-surface p-[1.8rem] shadow-[var(--card-shadow)]",
        notice.pinned && "ring-[0.2rem] ring-moss",
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
          className="w-[38%] shrink-0 self-stretch rounded-[0.8rem] object-cover"
        />
      ) : null}
    </article>
  );
}
