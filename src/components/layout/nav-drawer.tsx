// NAVIGERING: src/components/layout/nav-drawer.tsx

"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/page-transition/TransitionLink";
import { navGroups } from "@/config/site";
import { siteConfig } from "@/config/siteConfig";
import { AddressDetails, AssociationLogo } from "@/components/association";
import type { AssociationProfile } from "@/lib/types";
import type { SessionMember } from "@/lib/use-current-member";
import { cn, shortNameOf } from "@/lib/utils";

const PANEL_ID = "nav-drawer-panel";

type NavDrawerVariant = "default" | "hero";

function matchActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Titlar på de grupper som innehåller aktuell sida (för auto-expandering). */
function activeGroupIds(pathname: string) {
  return navGroups
    .filter((group) =>
      group.items.some((item) => matchActive(item.href, pathname)),
    )
    .map((group) => group.id);
}

export function NavDrawer({
  member,
  association,
  variant = "default",
}: {
  /** Den inloggade medlemmen, när /api/me har svarat (se useCurrentMember). */
  member: SessionMember | null;
  association: AssociationProfile;
  variant?: NavDrawerVariant;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroupIds(pathname)),
  );
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => setOpen(false);

  const toggleDrawer = () => {
    if (open) {
      setOpen(false);
      return;
    }

    // Rätt accordionläge sätts innan öppningsrenderingen börjar.
    setOpenGroups(new Set(activeGroupIds(pathname)));
    setOpen(true);
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Stäng vid sidbyte. Länkarna stänger även via onBeforeNavigate.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape, fokusfälla och scroll-lås när menyn är öppen.
  useEffect(() => {
    if (!open) return;

    const getFocusableElements = () => {
      const panelElements = panelRef.current
        ? Array.from(
            panelRef.current.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled])',
            ),
          ).filter(
            (element) =>
              !element.closest("[inert]") && element.offsetParent !== null,
          )
        : [];

      return triggerRef.current
        ? [triggerRef.current, ...panelElements]
        : panelElements;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusableElements();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  // Samma knapp behåller/återfår fokus när menyn stängs.
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const homeActive = matchActive("/", pathname);
  // Logga in/ut ligger i headern (AuthButton). Kvar i lådan: genvägen till
  // medlemssidorna för den som redan är inloggad.
  const memberLink = member
    ? {
        href: member.role === "admin" ? "/admin" : "/medlem",
        label: member.role === "admin" ? "Admin" : "Mina sidor",
      }
    : null;

  const portalContent = (
    <>
      {/*
        Samma knapp används för både öppning och stängning.
        Den ligger ovanför overlay och panel och morphar från ... till ×.
      */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "Stäng meny" : "Öppna meny"}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={toggleDrawer}
        style={{
          right: "max(1rem, calc((100vw - 72rem) / 2 + 1.5rem))",
        }}
        className={cn(
          "fixed z-[80] inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-sm",
          "transition-[background-color,border-color,color,box-shadow] duration-300",
          "focus-visible:outline-moss",
          variant === "hero" ? "top-[18px] sm:top-[26px]" : "top-[18px]",
          open
            ? "border-line bg-bone text-ink shadow-lg hover:bg-sand"
            : variant === "hero"
              ? "border-white/30 bg-black/20 text-white hover:bg-white/15"
              : "border-line bg-surface text-moss hover:bg-sand",
        )}
      >
        <span aria-hidden="true" className="relative block h-6 w-6">
          <span
            className={cn(
              "absolute left-1/2 top-1/2 block h-[3px] rounded-full bg-current",
              "transition-[width,transform,opacity] duration-300 ease-out",
              open
                ? "w-[22px] -translate-x-1/2 -translate-y-1/2 rotate-45"
                : "w-1 -translate-x-[10px] -translate-y-1/2 rotate-0",
            )}
          />
          <span
            className={cn(
              "absolute left-1/2 top-1/2 block h-[3px] w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current",
              "transition-[transform,opacity] duration-200",
              open ? "scale-0 opacity-0" : "scale-100 opacity-100",
            )}
          />
          <span
            className={cn(
              "absolute left-1/2 top-1/2 block h-[3px] rounded-full bg-current",
              "transition-[width,transform,opacity] duration-300 ease-out",
              open
                ? "w-[22px] -translate-x-1/2 -translate-y-1/2 -rotate-45"
                : "w-1 translate-x-[6px] -translate-y-1/2 rotate-0",
            )}
          />
        </span>
      </button>

      {/* Overlay och panel portaleras direkt till body. */}
      <div
        className={cn(
          "fixed inset-0 z-[60] overflow-hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
        inert={!open || undefined}
      >
        <div
          onClick={close}
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-sm",
            "transition-opacity duration-300 motion-reduce:transition-none",
            open ? "opacity-100" : "opacity-0",
          )}
        />

        <aside
          id={PANEL_ID}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Huvudmeny"
          style={{
            transform: open
              ? "translate3d(0, 0, 0)"
              : "translate3d(100%, 0, 0)",
            transitionTimingFunction: open
              ? "cubic-bezier(0, 0, 0.2, 1)"
              : "cubic-bezier(0.4, 0, 1, 1)",
          }}
          className={cn(
            "font-body absolute inset-y-0 right-0 z-10 flex",
            "w-[min(100vw,440px)] flex-col bg-bone text-ink shadow-2xl",
            "transition-[transform] duration-300 motion-reduce:transition-none",
          )}
        >
          {/* Övre del. Högersidan lämnas fri för den gemensamma menyknappen. */}
          <div className="shrink-0 px-6 pt-6 pr-20 sm:px-7 sm:pt-7 sm:pr-20">
            <div className="flex items-center gap-2.5">
              <AssociationLogo size={34} alt="" />
              <span className="font-display text-lg font-medium text-ink">
                {shortNameOf(association)}
              </span>
            </div>

            <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-ink/55">
              {siteConfig.description}
            </p>
          </div>

          {/* Navigering */}
          <nav className="mt-7 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
            <TransitionLink
              href="/"
              onBeforeNavigate={close}
              aria-current={homeActive ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center border-b border-line px-3 py-4 font-display text-lg font-medium",
                "transition-colors duration-200 hover:bg-sand focus-visible:outline-moss",
                homeActive ? "text-moss" : "text-ink",
              )}
            >
              Hem
            </TransitionLink>

            {navGroups.map((group) => {
              const items =
                group.id === "boende" && memberLink
                  ? [...group.items, memberLink]
                  : group.items;

              return (
                <AccordionGroup
                  key={group.id}
                  id={group.id}
                  title={group.title}
                  isOpen={openGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                >
                  {items.map((item) => (
                    <DrawerLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={matchActive(item.href, pathname)}
                      onNavigate={close}
                    />
                  ))}
                </AccordionGroup>
              );
            })}
          </nav>

          {/* Nedre kontaktområde */}
          <div className="shrink-0 border-t border-line px-6 py-5 text-sm text-ink/55 sm:px-7">
            <p className="font-medium text-ink/80">Behöver du hjälp?</p>
            <AddressDetails
              address={association}
              className="mt-1.5 leading-relaxed"
            />
            <TransitionLink
              href={siteConfig.links.contact}
              onBeforeNavigate={close}
              className="mt-2 inline-flex items-center gap-1 font-medium text-moss transition-colors hover:text-ink focus-visible:outline-moss"
            >
              Till kontaktsidan
              <span aria-hidden="true">→</span>
            </TransitionLink>
          </div>
        </aside>
      </div>
    </>
  );

  return (
    <>
      {/* Behåller rätt plats i headerns flexrad. */}
      <div aria-hidden="true" className="h-11 w-11 shrink-0" />
      {mounted ? createPortal(portalContent, document.body) : null}
    </>
  );
}

function AccordionGroup({
  id,
  title,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const regionId = `nav-group-${id}`;
  const buttonId = `nav-group-btn-${id}`;

  return (
    <div>
      <h3 className="m-0">
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={regionId}
          onClick={onToggle}
          className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-line px-3 py-4 text-left font-display text-lg font-medium text-ink transition-colors duration-200 hover:bg-sand focus-visible:outline-moss"
        >
          <span>{title}</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={cn(
              "shrink-0 text-ink/45 transition-transform duration-300 motion-reduce:transition-none",
              isOpen && "rotate-180",
            )}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </h3>

      <div
        id={regionId}
        role="region"
        aria-labelledby={buttonId}
        inert={!isOpen || undefined}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul className="flex flex-col py-1 pl-2">{children}</ul>
        </div>
      </div>
    </div>
  );
}

function drawerLinkClass(active: boolean) {
  return cn(
    "relative flex min-h-11 items-center rounded-lg py-3 pl-6 pr-3 text-base transition-colors duration-200 hover:bg-sand hover:text-moss focus-visible:outline-moss sm:py-2.5 sm:text-[15px]",
    active ? "font-medium text-moss" : "text-ink/80",
  );
}

function DrawerLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <li>
      <TransitionLink
        href={href}
        onBeforeNavigate={onNavigate}
        aria-current={active ? "page" : undefined}
        className={drawerLinkClass(active)}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-2 h-1.5 w-1.5 rounded-full bg-moss transition-opacity duration-200 motion-reduce:transition-none",
            active ? "opacity-100" : "opacity-0",
          )}
        />
        {label}
      </TransitionLink>
    </li>
  );
}
