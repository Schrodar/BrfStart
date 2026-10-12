"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, FormError, Input } from "@/components/ui";
import type { ActivationMode } from "@/lib/data/invitations";
import { activateAction, type ActivateState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Aktiverar…" : "Aktivera kontot"}
    </Button>
  );
}

export function ActivateForm({
  token,
  email,
  fullName,
  apartment,
  isAdmin,
  mode,
}: {
  token: string;
  email: string;
  fullName: string;
  apartment: string;
  isAdmin: boolean;
  /** new/reset: välj lösenord. verify: skriv det befintliga kontots lösenord. */
  mode: ActivationMode;
}) {
  const [state, action] = useActionState<ActivateState, FormData>(activateAction, {});

  return (
    <form action={action} className="space-y-5">
      <FormError>{state.error}</FormError>
      <input type="hidden" name="token" value={token} />

      <Field label="E-post" htmlFor="email" hint="Du loggar in med den här adressen.">
        <Input id="email" value={email} readOnly disabled autoComplete="username" />
      </Field>
      <Field label="Namn" htmlFor="fullName" required>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={fullName}
          required
          autoComplete="name"
        />
      </Field>
      {isAdmin ? null : (
        <Field label="Lägenhetsnummer" htmlFor="apartment">
          <Input id="apartment" name="apartment" defaultValue={apartment} />
        </Field>
      )}
      {mode === "verify" ? (
        <Field
          label="Ditt nuvarande lösenord"
          htmlFor="password"
          required
          hint="Du har redan ett konto hos en förening på plattformen. Skriv lösenordet du loggar in med där, så kopplas föreningen till samma konto."
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
      ) : (
        <>
          <Field
            label={mode === "reset" ? "Välj nytt lösenord" : "Välj lösenord"}
            htmlFor="password"
            required
            hint={
              mode === "reset"
                ? "Minst 8 tecken. Du har redan ett konto hos oss – lösenordet byts till det du väljer här, även hos andra föreningar."
                : "Minst 8 tecken."
            }
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
        </>
      )}

      <SubmitButton />
    </form>
  );
}
