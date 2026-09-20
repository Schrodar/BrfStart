"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthState } from "@/lib/actions/auth";
import { Button, Field, FormError, Input } from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Loggar in…" : "Logga in"}
    </Button>
  );
}

export function LoginForm({ next }: { next: string | null }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-5">
      <FormError>{state.error}</FormError>

      {/* Sidan besökaren skickades hit ifrån, kontrollerad av safeNextPath. */}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="E-post" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="din@epost.se"
        />
      </Field>

      <Field label="Lösenord" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </Field>

      <SubmitButton />

      <p className="text-center text-sm text-muted">
        Har du inget konto?{" "}
        <Link href="/registrera" className="text-brand-700 hover:underline">
          Registrera dig
        </Link>
      </p>

      <p className="text-center text-xs text-muted">
        Endast för boende och styrelse. Nya konton godkänns av styrelsen.
      </p>
    </form>
  );
}
