"use client";

import { useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

const noSubscription = () => () => {};

/**
 * Sant först när sidan är hydrerad. Innan dess skulle ett klick skicka
 * formuläret direkt till servern – utan frågan.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/**
 * En knapp som frågar innan formuläret skickas: "Vill du …?" och sedan OK.
 * Avbryt skickar ingenting. Samma mönster som borttagningen av dokument, men
 * knappen går inte att trycka på förrän frågan kan visas.
 */
export function ConfirmSubmit({
  action,
  fields,
  question,
  children,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  /** Dolda fält till action:en, t.ex. { memberId: "…" }. */
  fields: Record<string, string>;
  /** Frågan i dialogen. */
  question: string;
  children: ReactNode;
  className?: string;
}) {
  function ask(e: FormEvent<HTMLFormElement>) {
    if (!window.confirm(question)) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={ask}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Submit className={className}>{children}</Submit>
    </form>
  );
}

function Submit({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  const hydrated = useHydrated();
  return (
    <button type="submit" disabled={!hydrated || pending} className={className}>
      {pending ? "Sparar…" : children}
    </button>
  );
}
