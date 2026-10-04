"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button, Field, FormError, Input } from "@/components/ui";
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
}: {
  token: string;
  email: string;
  fullName: string;
  apartment: string;
  isAdmin: boolean;
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
      <Field
        label="Välj lösenord"
        htmlFor="password"
        required
        hint="Minst 8 tecken. Har du redan ett konto på en annan förenings sida hos oss byts lösenordet där också."
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

      <SubmitButton />
    </form>
  );
}
