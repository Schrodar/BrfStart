"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SubNavItem {
  href: string;
  label: string;
  /**
   * Undersidor. Visas som en egen rad under menyn när man är inne i
   * avsnittet. Ta med avsnittets egen sida som första post om den ska gå att
   * nå från raden, t.ex. { href: "/admin/foreningsinfo", label: "Fakta" }.
   */
  children?: SubNavItem[];
  /** Litet märke efter etiketten, t.ex. antal aktiva ärenden. */
  badge?: SubNavBadge;
}

export interface SubNavBadge {
  /** Det som syns, t.ex. "2". */
  text: string;
  /** Det som läses upp, t.ex. "2 aktiva felanmälningar". */
  label: string;
  /** Något nytt har hänt – märket får en pulserande prick. */
  attention?: boolean;
}

/**
 * Hur väl en adress stämmer med sidan man är på: längden vid träff, annars -1.
 * Exakt träff räcker alltid. Prefixträff (/admin/nyheter på /admin/nyheter/ny)
 * gäller bara adresser som inte är roten för en annan post i samma meny –
 * annars skulle Översikt (/admin) lysa på varje adminsida.
 */
function matchLength(href: string, pathname: string, allHrefs: string[]) {
  if (pathname === href) return href.length;
  const isRoot = allHrefs.some(
    (other) => other !== href && other.startsWith(`${href}/`),
  );
  return !isRoot && pathname.startsWith(`${href}/`) ? href.length : -1;
}

/** Posten vars adress stämmer bäst med sidan. Den mest specifika vinner. */
function findActive(
  items: SubNavItem[],
  pathname: string,
  hrefsOf: (item: SubNavItem) => string[],
): SubNavItem | null {
  const allHrefs = items.flatMap(hrefsOf);
  let best: SubNavItem | null = null;
  let bestLength = -1;
  for (const item of items) {
    for (const href of hrefsOf(item)) {
      const length = matchLength(href, pathname, allHrefs);
      if (length > bestLength) {
        best = item;
        bestLength = length;
      }
    }
  }
  return best;
}

/** En förälder räknas som aktiv även när man står på någon av dess undersidor. */
const withChildren = (item: SubNavItem) => [
  item.href,
  ...(item.children ?? []).map((child) => child.href),
];

/** Horisontell delnavigation för medlems- och adminområdet. */
export function SubNav({
  items,
  label,
}: {
  items: SubNavItem[];
  /** Namn på menyn för skärmläsare, t.ex. "Adminmeny". */
  label?: string;
}) {
  const pathname = usePathname();
  const active = findActive(items, pathname, withChildren);
  const navRef = useRef<HTMLElement>(null);
  const scrolledOnce = useRef(false);
  const openGroup = active?.children?.length ? active : null;
  const hasGroups = items.some((item) => item.children?.length);

  // Raden behåller sitt innehåll medan den fälls ihop – annars skulle länkarna
  // försvinna innan animationen hunnit börja. `generation` ökar varje gång
  // raden öppnas, så att flikarna animeras in på nytt i stället för att bara
  // stå där sedan förra gången.
  const [view, setView] = useState({
    group: openGroup,
    open: openGroup !== null,
    generation: 0,
  });
  if (openGroup) {
    if (!view.open || openGroup.href !== view.group?.href) {
      setView({ group: openGroup, open: true, generation: view.generation + 1 });
    } else if (openGroup !== view.group) {
      // Samma avsnitt men nya props (t.ex. efter en revalidering): byt bara
      // innehållet, utan ny animation.
      setView({ ...view, group: openGroup });
    }
  } else if (view.open) {
    setView({ ...view, open: false });
  }

  // På smala skärmar scrollar flikraden i sidled. Håll den aktiva fliken i
  // bild – annars dyker undermenyn upp utan att man ser vilket avsnitt den
  // hör till. Bara i sidled (scrollTo på raden), så att sidan inte hoppar.
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>("[aria-current]");
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    const smooth =
      scrolledOnce.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrolledOnce.current = true;
    nav.scrollTo({
      left: current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2,
      behavior: smooth ? "smooth" : "auto",
    });
  }, [active?.href]);

  return (
    <div className="-mb-px">
      <nav
        ref={navRef}
        aria-label={label}
        // Linjen under flikarna ritas som inre skugga så att den aktiva
        // flikens understrykning hamnar ovanpå den.
        className="relative flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--color-border)]"
      >
        {items.map((item) => {
          const isActive = item === active;
          const hasChildren = Boolean(item.children?.length);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                isActive ? (pathname === item.href ? "page" : "true") : undefined
              }
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-muted hover:border-border hover:text-foreground",
              )}
            >
              {item.label}
              {item.badge ? <NavBadge {...item.badge} /> : null}
              {hasChildren ? <Chevron open={isActive} /> : null}
            </Link>
          );
        })}
      </nav>

      {/* Finns det avsnitt med undersidor ligger raden alltid i DOM:en,
          hopfälld. Då animeras den ut när man går in i avsnittet i stället
          för att bara dyka upp. */}
      {hasGroups ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
            view.open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          inert={!view.open || undefined}
        >
          <div className="overflow-hidden">
            {view.group ? (
              <ChildRow
                key={view.generation}
                group={view.group}
                pathname={pathname}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NavBadge({ text, label, attention }: SubNavBadge) {
  return (
    <span className="relative ml-0.5 inline-flex">
      {/* Pulsen ligger BAKOM märket så att siffran aldrig skyms, och slår
          tre gånger – tillräckligt för att synas, inte nog för att störa. */}
      {attention ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-60 [animation-iteration-count:3] motion-reduce:hidden"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums",
          attention ? "bg-amber-500 text-white" : "bg-brand-100 text-brand-800",
        )}
      >
        {text}
      </span>
      <span className="sr-only">, {label}</span>
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn(
        "shrink-0 opacity-60 transition-transform duration-300 ease-out motion-reduce:transition-none",
        open && "rotate-180",
      )}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Undersidorna som ett segmenterat reglage. Markeringen är ett eget element
 * som glider till den aktiva fliken när man byter sida.
 */
function ChildRow({ group, pathname }: { group: SubNavItem; pathname: string }) {
  const children = group.children ?? [];
  const activeChild = findActive(children, pathname, (child) => [child.href]);
  const listRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; width: number } | null>(null);
  const [glide, setGlide] = useState(false);

  // Mät den aktiva fliken före målning, och igen när bredden ändras (t.ex.
  // när typsnittet laddats klart).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const current = list.querySelector<HTMLElement>("[aria-current]");
      setThumb(
        current ? { x: current.offsetLeft, width: current.offsetWidth } : null,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeChild?.href]);

  // Första placeringen ska inte glida in från vänsterkanten – slå på
  // övergången först när markeringen väl står på plats.
  useEffect(() => {
    if (!thumb || glide) return;
    const frame = requestAnimationFrame(() => setGlide(true));
    return () => cancelAnimationFrame(frame);
  }, [thumb, glide]);

  return (
    <div className="max-w-full overflow-x-auto py-3">
      <nav aria-label={group.label}>
        <div
          ref={listRef}
          className="relative inline-flex items-center gap-0.5 rounded-full border border-border bg-background p-1"
        >
          <span
            aria-hidden="true"
            className={cn(
              "subnav-fade absolute inset-y-1 left-0 rounded-full bg-surface shadow-sm ring-1 ring-black/5",
              glide &&
                "transition-[transform,width] duration-300 ease-out motion-reduce:transition-none",
              !thumb && "invisible",
            )}
            style={
              thumb
                ? { width: thumb.width, transform: `translateX(${thumb.x}px)` }
                : undefined
            }
          />
          {children.map((child, index) => {
            const isActive = child === activeChild;
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={
                  isActive
                    ? pathname === child.href
                      ? "page"
                      : "true"
                    : undefined
                }
                style={{ animationDelay: `${index * 60}ms` }}
                className={cn(
                  "subnav-pill relative whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "text-brand-700" : "text-muted hover:text-foreground",
                  // Innan markeringen mätts (första renderingen från servern)
                  // bär den aktiva fliken sin egen bakgrund.
                  isActive && !thumb && "bg-surface shadow-sm ring-1 ring-black/5",
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
