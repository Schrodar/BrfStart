"use client";

import { useActionState, useState } from "react";
import { AssociationLogo } from "@/components/association";
import {
  Button,
  FormError,
  SubmitButton,
  type ButtonVariant,
} from "@/components/ui";
import type { AccessLetter } from "@/lib/data/access-codes";
import type { LetterState } from "./letter-state";

type LetterAction = (prev: LetterState, formData: FormData) => Promise<LetterState>;

/** Avsändaren i brevet. */
export interface LetterSender {
  name: string;
  contactEmail: string;
}

/**
 * En knapp som skapar koder och visar breven för utskrift. Koderna finns bara
 * i svaret från servern – laddas sidan om måste nya skapas.
 *
 * Med confirmText krävs ett andra klick. Det gäller allt som gör gamla koder
 * ogiltiga eller raderar ett konto.
 */
export function CodeLettersButton({
  action,
  fields,
  label,
  pendingText = "Skapar koder…",
  variant = "primary",
  confirmText,
  sender,
}: {
  action: LetterAction;
  /** Dolda fält till action:en, t.ex. { scope: "", onlyMissing: "1" }. */
  fields: Record<string, string>;
  label: string;
  pendingText?: string;
  variant?: ButtonVariant;
  confirmText?: string;
  sender: LetterSender;
}) {
  const [state, formAction] = useActionState<LetterState, FormData>(action, {});
  const [confirming, setConfirming] = useState(false);
  const askFirst = Boolean(confirmText) && !confirming;

  return (
    <div className="space-y-4">
      {askFirst ? (
        <Button type="button" variant={variant} onClick={() => setConfirming(true)}>
          {label}
        </Button>
      ) : (
        <form
          action={formAction}
          onSubmit={() => setConfirming(false)}
          className="space-y-3"
        >
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {confirmText ? (
            <p className="max-w-xl rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {confirmText}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton variant={variant} pendingText={pendingText}>
              {confirmText ? `Ja, ${label.toLowerCase()}` : label}
            </SubmitButton>
            {confirmText ? (
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                Avbryt
              </Button>
            ) : null}
          </div>
        </form>
      )}

      <FormError>{state.error}</FormError>

      {state.letters && state.letters.length > 0 && state.origin ? (
        <LetterSheet letters={state.letters} origin={state.origin} sender={sender} />
      ) : null}
    </div>
  );
}

/**
 * Vid utskrift döljs allt utom breven: varje element som varken innehåller
 * breven eller ligger i dem. Elementen runt breven behåller sin plats men
 * tappar marginaler och ramar, så att första brevet börjar överst på sidan.
 */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 16mm; }
  body *:not(:has(.brev-utskrift)):not(.brev-utskrift):not(.brev-utskrift *) {
    display: none !important;
  }
  body *:has(.brev-utskrift) {
    margin: 0 !important; padding: 0 !important; border: 0 !important;
    box-shadow: none !important; background: none !important;
    min-height: 0 !important; max-width: none !important;
    transform: none !important; opacity: 1 !important;
  }
  .brev {
    break-after: page; margin: 0 !important; padding: 0 !important;
    border: 0 !important; box-shadow: none !important; max-width: none !important;
  }
  .brev:last-child { break-after: auto; }
}
`;

function LetterSheet({
  letters,
  origin,
  sender,
}: {
  letters: AccessLetter[];
  origin: string;
  sender: LetterSender;
}) {
  const host = new URL(origin).host;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="max-w-2xl">
          <strong>
            {letters.length === 1 ? "Brevet är klart." : `${letters.length} brev är klara.`}
          </strong>{" "}
          Koderna visas bara nu. Skriv ut innan du lämnar sidan – laddar du om
          måste nya koder skapas.
        </p>
        <Button type="button" size="sm" onClick={() => window.print()}>
          Skriv ut
        </Button>
      </div>

      <div className="brev-utskrift space-y-6">
        {letters.map((letter) => (
          <Letter key={letter.apartmentId} letter={letter} host={host} sender={sender} />
        ))}
      </div>

      <style>{PRINT_CSS}</style>
    </div>
  );
}

/** Ett brev per brevlåda, en A4-sida. Skrivet till hela hushållet. */
function Letter({
  letter,
  host,
  sender,
}: {
  letter: AccessLetter;
  host: string;
  sender: LetterSender;
}) {
  const where = [letter.buildingName, letter.buildingAddress]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="brev mx-auto max-w-[180mm] rounded-lg border border-border bg-white p-10 text-[15px] leading-relaxed text-neutral-900 shadow-sm">
      <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-5">
        <div className="flex items-center gap-3">
          <AssociationLogo size={40} alt="" />
          <p className="text-lg font-semibold">{sender.name}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">Lägenhet {letter.number}</p>
          {letter.standardNumber ? (
            <p>Lantmäteriets nr {letter.standardNumber}</p>
          ) : null}
          {where ? <p>{where}</p> : null}
        </div>
      </header>

      <h2 className="mt-8 text-2xl font-semibold tracking-tight">
        Ert konto på föreningens hemsida
      </h2>
      <p className="mt-3">
        Varje lägenhet har ett eget konto på hemsidan. Där gör och följer ni
        felanmälningar, läser föreningens interna dokument och sköter
        uppgifterna om lägenheten.
      </p>

      <h3 className="mt-6 font-semibold">Så aktiverar ni kontot</h3>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          Gå till <strong>{host}/aktivera</strong>.
        </li>
        <li>Skriv in koden nedan och välj ett lösenord.</li>
        <li>
          Logga sedan in på <strong>{host}</strong> med lägenhetsnummer{" "}
          <strong>{letter.number}</strong> och lösenordet.
        </li>
      </ol>

      <div className="my-8 rounded-xl border-2 border-neutral-900 px-6 py-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
          Lägenhetens kod
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-[0.15em]">
          {letter.code}
        </p>
      </div>

      <h3 className="font-semibold">Spara brevet – koden är lägenhetens nyckel</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>
          Glömt lösenordet? Använd koden igen och välj ett nytt. Det gamla
          slutar då att fungera.
        </li>
        <li>Ge inte koden till någon utanför hushållet.</li>
        <li>
          Tappat brevet? Kontakta styrelsen
          {sender.contactEmail ? (
            <>
              {" "}
              på <strong>{sender.contactEmail}</strong>
            </>
          ) : null}
          , så får lägenheten en ny kod i ett nytt brev.
        </li>
        <li>Säljer ni lägenheten får köparen en ny kod, och den här slutar gälla.</li>
      </ul>
    </article>
  );
}
