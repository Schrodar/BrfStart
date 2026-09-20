"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { Apartment } from "@/lib/types";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
  Textarea,
} from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function FactsForm({
  apartment,
  action,
}: {
  apartment: Apartment;
  action: Action;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="apartmentId" value={apartment.id} />
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Lägenhetsnummer"
          htmlFor="number"
          required
          hint="Föreningens eget nummer. Unikt i föreningen."
        >
          <Input
            id="number"
            name="number"
            defaultValue={apartment.number}
            required
          />
        </Field>
        <Field
          label="Lantmäteriets nummer"
          htmlFor="standardNumber"
          hint="T.ex. 1101 – våningsplan (entré = 10) + lägenhet på planet."
        >
          <Input
            id="standardNumber"
            name="standardNumber"
            defaultValue={apartment.standardNumber}
            inputMode="numeric"
          />
        </Field>
        <Field label="Våning" htmlFor="floor">
          <Input id="floor" name="floor" defaultValue={apartment.floor} />
        </Field>
        <Field label="Antal rum" htmlFor="rooms">
          <Input
            id="rooms"
            name="rooms"
            defaultValue={apartment.rooms}
            placeholder="t.ex. 3 rok"
          />
        </Field>
        <Field label="Storlek (m²)" htmlFor="sizeSqm">
          <Input
            id="sizeSqm"
            name="sizeSqm"
            defaultValue={apartment.sizeSqm}
            placeholder="t.ex. 72"
          />
        </Field>
      </div>
      <Field label="Beskrivning" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          defaultValue={apartment.description}
        />
      </Field>

      <SubmitButton>Spara lägenhetsfakta</SubmitButton>
    </form>
  );
}
