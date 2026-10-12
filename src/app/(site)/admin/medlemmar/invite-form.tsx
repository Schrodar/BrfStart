"use client";

import { useActionState, useState } from "react";
import { formatDate } from "@/lib/utils";
import {
  Button,
  buttonClasses,
  Field,
  FormError,
  Input,
  Select,
  SubmitButton,
} from "@/components/ui";
import { createInvitationAction, type InviteState } from "./actions";

const INITIAL: InviteState = {
  ok: true,
  message: "",
  link: "",
  email: "",
  fullName: "",
  role: "member",
  expiresAt: "",
};

/** Färdigt mejl som styrelsen skickar från sin egen e-post. */
function mailtoHref(state: InviteState, associationName: string): string {
  const roleText = state.role === "admin" ? "styrelseadmin" : "boende";
  const subject = `Inbjudan till ${associationName}`;
  const body = [
    `Hej ${state.fullName}!`,
    "",
    `Du är inbjuden som ${roleText} på ${associationName}s webbplats. Öppna länken och välj ett lösenord för att aktivera ditt konto:`,
    "",
    state.link,
    "",
    `Länken gäller till och med ${formatDate(state.expiresAt)} och kan bara användas en gång.`,
    "",
    "Hälsningar",
    "Styrelsen",
  ].join("\r\n");
  return `mailto:${encodeURIComponent(state.email)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function InviteForm({ associationName }: { associationName: string }) {
  const [state, formAction] = useActionState<InviteState, FormData>(
    createInvitationAction,
    INITIAL,
  );
  const [role, setRole] = useState<"admin" | "member">("member");
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
  }

  return (
    <div className="space-y-4">
      <form action={formAction} onSubmit={() => setCopied(false)} className="space-y-4">
        {state.ok ? null : <FormError>{state.message}</FormError>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-post" htmlFor="invite-email" required>
            <Input id="invite-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field label="Namn" htmlFor="invite-name" required>
            <Input id="invite-name" name="fullName" required minLength={2} autoComplete="off" />
          </Field>
          <Field label="Roll" htmlFor="invite-role">
            <Select
              id="invite-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
            >
              <option value="member">Boende</option>
              <option value="admin">Styrelse (admin)</option>
            </Select>
          </Field>
          {role === "member" ? (
            <Field label="Lägenhetsnummer" htmlFor="invite-apartment">
              <Input id="invite-apartment" name="apartment" />
            </Field>
          ) : null}
        </div>

        {role === "member" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="canManageListing" className="h-4 w-4 rounded border-border" />
            Får lägga upp sin lägenhet till salu (annonsrätt)
          </label>
        ) : null}

        <p className="text-xs text-muted">
          {role === "admin"
            ? "En admin kommer åt hela adminpanelen, precis som du."
            : "Boende godkänns direkt och kommer åt Mina sidor."}{" "}
          Kontot skapas först när personen öppnar länken och väljer sitt lösenord.
          Länken gäller i 7 dagar och kan bara användas en gång.
        </p>

        <SubmitButton pendingText="Skapar…">Skapa inbjudan</SubmitButton>
      </form>

      {state.link ? (
        <div className="space-y-3 rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-medium text-foreground">
            Inbjudan till {state.fullName} är klar. Skicka länken till {state.email}.
          </p>
          <code className="block break-all rounded bg-surface px-3 py-2 text-xs">
            {state.link}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={copy}>
              {copied ? "Kopierad" : "Kopiera länk"}
            </Button>
            <a href={mailtoHref(state, associationName)} className={buttonClasses("primary", "sm")}>
              Öppna i mejl
            </a>
          </div>
          <p className="text-xs text-muted">
            "Öppna i mejl" startar din vanliga e-post med ett färdigt mejl. Länken visas bara
            nu – skapa en ny inbjudan om den kommer bort.
          </p>
        </div>
      ) : null}
    </div>
  );
}
