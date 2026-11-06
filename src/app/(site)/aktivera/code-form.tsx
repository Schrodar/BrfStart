"use client";

import { useActionState } from "react";
import { Field, FormError, Input, SubmitButton } from "@/components/ui";
import { activateWithCodeAction, type ActivateState } from "./actions";

/** Koden från brevet och ett lösenord – det är hela kontot. */
export function CodeForm() {
  const [state, action] = useActionState<ActivateState, FormData>(
    activateWithCodeAction,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      <FormError>{state.error}</FormError>

      <Field
        label="Kod"
        htmlFor="code"
        required
        hint="Står i brevet från föreningen, till exempel K7QF-M2XP-9CRT."
      >
        <Input
          id="code"
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono uppercase tracking-wider"
        />
      </Field>

      <Field
        label="Välj lösenord"
        htmlFor="password"
        required
        hint="Minst 8 tecken. Har lägenheten redan ett konto får det det här lösenordet, och den gamla inloggningen slutar fungera."
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>

      <Field label="Upprepa lösenordet" htmlFor="confirm" required>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>

      <SubmitButton pendingText="Aktiverar…" className="w-full">
        Aktivera kontot
      </SubmitButton>
    </form>
  );
}
