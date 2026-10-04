"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction, type AuthState } from "@/lib/actions/auth";
import {
  Button,
  Field,
  FormError,
  FormSuccess,
  Input,
} from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Registrerar…" : "Skapa konto"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(
    registerAction,
    {},
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormSuccess>{state.success}</FormSuccess>
        <Link
          href="/"
          className="block text-center text-sm text-brand-700 hover:underline"
        >
          Till startsidan
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <FormError>{state.error}</FormError>

      <Field label="Namn" htmlFor="fullName" required>
        <Input id="fullName" name="fullName" required autoComplete="name" />
      </Field>
      <Field label="E-post" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </Field>
      <Field
        label="Lägenhetsnummer"
        htmlFor="apartment"
        required
        hint="Anges för att styrelsen ska kunna verifiera att du bor i föreningen."
      >
        <Input id="apartment" name="apartment" required />
      </Field>
      <Field
        label="Lösenord"
        htmlFor="password"
        required
        hint="Minst 6 tecken. Har du redan ett konto hos en annan förening här: använd samma lösenord."
      >
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </Field>

      <SubmitButton />

      <p className="text-center text-sm text-muted">
        Har du redan ett konto?{" "}
        <Link href="/logga-in" className="text-brand-700 hover:underline">
          Logga in
        </Link>
      </p>
    </form>
  );
}
