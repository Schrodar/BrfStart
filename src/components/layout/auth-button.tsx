// NAVIGERING: src/components/layout/auth-button.tsx

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { TransitionLink } from "@/components/page-transition/TransitionLink";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Logga in / Logga ut i headern, direkt till vänster om menyknappen.
 *
 * Låg tidigare bara inne i sidomenyn, dit en besökare kom först efter att ha
 * öppnat lådan. Inloggning är den enda återkommande åtgärden för boende och
 * hör därför hemma i toppraden.
 *
 * Under sm krymper knappen till samma runda ikonknapp som menyöppnaren:
 * föreningsnamnet är konfigurerbart och kan vara långt, och två textetiketter
 * i samma rad tvingar annars namnet till två rader på telefon. Etiketten finns
 * kvar för skärmläsare via sr-only.
 */

type AuthButtonVariant = "default" | "hero";

function buttonClass(variant: AuthButtonVariant) {
  return cn(
    // Ram och platta är borttagna med flit: knappen ska läsas som text bredvid
    // menyknappen, inte konkurrera med den. Dämpad i vila, full kontrast på hover.
    "inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-full",
    "sm:w-auto sm:px-3",
    "font-body text-sm font-medium transition-colors duration-200",
    variant === "hero"
      ? "text-white/60 hover:text-white focus-visible:outline-white"
      : "text-ink/50 hover:text-ink focus-visible:outline-moss",
  );
}

function Icon({ direction }: { direction: "in" | "out" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {direction === "in" ? (
        <>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="m10 17 5-5-5-5" />
          <path d="M15 12H3" />
        </>
      ) : (
        <>
          <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </>
      )}
    </svg>
  );
}

/** Reglage – tre skjutreglage. Samma ikon för Mina sidor och adminpanelen. */
function SlidersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M4 6h10" />
      <path d="M18 6h2" />
      <circle cx="16" cy="6" r="2" />
      <path d="M4 12h2" />
      <path d="M10 12h10" />
      <circle cx="8" cy="12" r="2" />
      <path d="M4 18h12" />
      <path d="M20 18h0" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

/**
 * Den inloggades genväg, till vänster om Logga ut. Boende kommer direkt till
 * Mina sidor. Godkända administratörer får en rullgardin med adminpanelen och
 * Mina sidor – styrelsen bor också i föreningen.
 *
 * Vem som är admin avgör anroparen (site-header) med samma villkor som
 * requireAdmin(). Sidorna kontrollerar ändå behörigheten själva på servern.
 */
export function AccountButton({
  admin,
  variant = "default",
}: {
  admin: boolean;
  variant?: AuthButtonVariant;
}) {
  if (admin) return <AdminMenu variant={variant} />;

  return (
    <TransitionLink href="/medlem" className={buttonClass(variant)}>
      <SlidersIcon />
      <span className="sr-only sm:not-sr-only">Mina sidor</span>
    </TransitionLink>
  );
}

const ADMIN_MENU = [
  { href: "/admin", label: "Adminpanel" },
  { href: "/medlem", label: "Mina sidor" },
] as const;

/**
 * Rullgardinen för admins: en knapp som visar och döljer en lista med länkar
 * (disclosure-mönstret, inte ett ARIA-menyläge med piltangenter). Tab går
 * vidare in i listan, Escape och klick utanför stänger.
 */
function AdminMenu({ variant }: { variant: AuthButtonVariant }) {
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sidan menyn öppnades på. Byts sidan – via en länk här, bakåtknappen eller
  // något annat – är menyn stängd igen, utan en effekt som nollställer den.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenOn(null);
    };
    // Escape lämnar fokus på knappen, så att tangentbordet inte tappar bort sig.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenOn(null);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      // Tabbar man vidare ut ur listan stängs den.
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) {
          close();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={buttonClass(variant)}
      >
        <SlidersIcon />
        <span className="sr-only sm:not-sr-only">Administration</span>
        {/* Pilen visar att knappen öppnar något. På telefon är knappen bara ikonen. */}
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
            "-ml-0.5 hidden shrink-0 transition-transform duration-200 motion-reduce:transition-none sm:block",
            open && "rotate-180",
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Listan ligger kvar i DOM:en så att den kan tona in. Stängd är den
          inert: varken klickbar, fokuserbar eller synlig för skärmläsare. */}
      <div
        id={menuId}
        inert={!open || undefined}
        className={cn(
          "absolute right-0 top-full z-50 mt-2 w-52 origin-top-right rounded-xl border border-line bg-bone p-1.5 text-ink shadow-lg",
          "transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        <ul className="flex flex-col">
          {ADMIN_MENU.map((item) => {
            const exact = pathname === item.href;
            const inside = exact || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <TransitionLink
                  href={item.href}
                  onBeforeNavigate={close}
                  aria-current={exact ? "page" : inside ? "true" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-lg px-3 font-body text-sm font-medium",
                    "transition-colors duration-200 hover:bg-sand hover:text-moss focus-visible:outline-moss",
                    inside ? "text-moss" : "text-ink/80",
                  )}
                >
                  {item.label}
                </TransitionLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function AuthButton({
  signedIn,
  variant = "default",
}: {
  /** null = sessionen är inte kontrollerad än (se useCurrentMember). */
  signedIn: boolean | null;
  variant?: AuthButtonVariant;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  // Håll platsen tills sessionen är känd – det tar bara millisekunder, och
  // en inloggad ska inte se "Logga in" blinka till.
  if (signedIn === null) {
    return (
      <span aria-hidden="true" className={cn(buttonClass(variant), "invisible")}>
        <Icon direction="in" />
        <span className="sr-only sm:not-sr-only">Logga in</span>
      </span>
    );
  }

  if (!signedIn) {
    return (
      <TransitionLink href="/logga-in" className={buttonClass(variant)}>
        <Icon direction="in" />
        <span className="sr-only sm:not-sr-only">Logga in</span>
      </TransitionLink>
    );
  }

  // Utloggningen sker i webbläsaren, så att headern märker den direkt även när
  // man redan står på startsidan (en server action hade inte gett något sidbyte).
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await createSupabaseBrowserClient().auth.signOut();
        router.push("/");
        router.refresh();
        setPending(false);
      }}
      className={buttonClass(variant)}
    >
      <Icon direction="out" />
      <span className="sr-only sm:not-sr-only">Logga ut</span>
    </button>
  );
}
