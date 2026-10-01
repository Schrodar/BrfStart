// NAVIGERING: src/components/layout/auth-button.tsx

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
