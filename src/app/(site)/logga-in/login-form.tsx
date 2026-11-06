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

      <Field
        label="Lägenhetsnummer"
        htmlFor="identifier"
        required
        hint="Står i brevet från föreningen. Styrelsen loggar in med sin e-post."
      >
        <Input
          id="identifier"
          name="identifier"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="t.ex. 23"
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

      <div className="space-y-1.5 text-center text-sm text-muted">
        <p>
          Inget konto än?{" "}
          <Link href="/aktivera" className="link-inline">
            Aktivera med koden i brevet
          </Link>
        </p>
        <p>Glömt lösenordet? Använd koden igen och välj ett nytt.</p>
      </div>
    </form>
  );
}
