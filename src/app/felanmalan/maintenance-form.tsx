"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitMaintenance, type MaintenanceState } from "./actions";
import { HONEYPOT_FIELD } from "@/lib/form";
import {
  Button,
  Field,
  FormError,
  FormSuccess,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Skickar…" : "Skicka felanmälan"}
    </Button>
  );
}

export function MaintenanceForm({
  categories,
  member,
}: {
  categories: { id: string; name: string }[];
  /** Inloggad anmälare. canTrack = kontot är godkänt och når Mina sidor. */
  member: { fullName: string; email: string; canTrack: boolean } | null;
}) {
  const [state, action] = useActionState<MaintenanceState, FormData>(
    submitMaintenance,
    {},
  );

  if (state.success) {
    return (
      <div className="space-y-3">
        <FormSuccess>{state.success}</FormSuccess>
        {member?.canTrack ? (
          <p className="text-sm text-muted">
            Ärendet syns under{" "}
            <Link
              href="/medlem/felanmalningar"
              className="font-medium text-brand-700 hover:underline"
            >
              Mina sidor → Felanmälningar
            </Link>
            , och du får besked när styrelsen ändrar status.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <FormError>{state.error}</FormError>

      {/* Honeypot mot spam: dolt för både ögon och skärmläsare, och går inte
          att tabba till. Bara för utloggade – servern släpper alltid igenom
          inloggade (se actions.ts). */}
      {member ? null : (
        <div className="sr-only" aria-hidden="true">
          <label htmlFor={HONEYPOT_FIELD}>Lämna det här fältet tomt</label>
          <input
            id={HONEYPOT_FIELD}
            name={HONEYPOT_FIELD}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>
      )}

      {member ? (
        <p className="rounded-lg bg-brand-50/70 px-3 py-2 text-sm text-brand-800">
          Du är inloggad som{" "}
          <strong className="font-medium">{member.fullName}</strong>.{" "}
          {member.canTrack
            ? "Ärendet kopplas till ditt konto – du kan följa det under Mina sidor och får besked när styrelsen ändrar status."
            : "Ärendet kopplas till ditt konto och syns under Mina sidor när styrelsen har godkänt kontot."}
        </p>
      ) : null}

      <p className="text-sm text-muted">
        Vi behöver kunna nå dig om ärendet – fyll i e-post eller telefon.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="E-post" htmlFor="email" hint="E-post eller telefon krävs.">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={member?.email}
          />
        </Field>
        <Field label="Telefon" htmlFor="phone" hint="E-post eller telefon krävs.">
          <Input id="phone" name="phone" autoComplete="tel" />
        </Field>
        <Field label="Namn" htmlFor="name" hint="Valfritt.">
          <Input
            id="name"
            name="name"
            autoComplete="name"
            defaultValue={member?.fullName}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kategori" htmlFor="categoryId" required>
          <Select id="categoryId" name="categoryId" defaultValue="" required>
            <option value="" disabled>
              Välj kategori…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Var finns felet?" htmlFor="location" required hint="T.ex. tvättstuga plan 1, trapphus B.">
          <Input id="location" name="location" required />
        </Field>
      </div>

      <Field label="Beskrivning" htmlFor="description" required>
        <Textarea
          id="description"
          name="description"
          required
          placeholder="Beskriv felet så tydligt du kan."
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
