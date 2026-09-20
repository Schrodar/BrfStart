"use client";

import { useActionState } from "react";
import { updateAssociationProfileAction } from "./actions";
import type { FormState } from "@/lib/form";
import type { AssociationProfile } from "@/lib/types";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
} from "@/components/ui";

export function ProfileForm({ profile }: { profile: AssociationProfile }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateAssociationProfileAction,
    {},
  );

  return (
    <form action={action} className="space-y-8">
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <fieldset className="space-y-4">
        <legend className="font-semibold">Föreningen</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Namn" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              defaultValue={profile.name}
              required
              minLength={2}
            />
          </Field>
          <Field
            label="Kortnamn"
            htmlFor="shortName"
            hint="Visas i sidhuvudet och i fliktiteln. Lämna tomt för att använda hela namnet."
          >
            <Input
              id="shortName"
              name="shortName"
              defaultValue={profile.shortName}
              placeholder={profile.name}
            />
          </Field>
          <Field label="Organisationsnummer" htmlFor="organizationNumber">
            <Input
              id="organizationNumber"
              name="organizationNumber"
              defaultValue={profile.organizationNumber}
              placeholder="769600-0000"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold">Adress</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Gatuadress" htmlFor="street" className="sm:col-span-3">
            <Input
              id="street"
              name="street"
              defaultValue={profile.street}
              autoComplete="street-address"
            />
          </Field>
          <Field label="Postnummer" htmlFor="postalCode">
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={profile.postalCode}
              autoComplete="postal-code"
            />
          </Field>
          <Field label="Ort" htmlFor="city" className="sm:col-span-2">
            <Input
              id="city"
              name="city"
              defaultValue={profile.city}
              autoComplete="address-level2"
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold">Styrelsens kontaktuppgifter</legend>
        <p className="text-sm text-muted">
          Visas i sidfoten, på kontaktsidan och i integritetspolicyn. Nya
          felanmälningar och registreringar aviseras till e-postadressen.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="E-post" htmlFor="contactEmail">
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={profile.contactEmail}
            />
          </Field>
          <Field label="Telefon" htmlFor="contactPhone">
            <Input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={profile.contactPhone}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold">Förvaltare</legend>
        <p className="text-sm text-muted">
          Visas på kontaktsidan och sidan för mäklare. Lämna alla fält tomma om
          föreningen sköter förvaltningen själv – då döljs förvaltarrutorna.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Namn"
            htmlFor="propertyManagerName"
            className="sm:col-span-2"
          >
            <Input
              id="propertyManagerName"
              name="propertyManagerName"
              defaultValue={profile.propertyManagerName}
            />
          </Field>
          <Field label="Telefon" htmlFor="propertyManagerPhone">
            <Input
              id="propertyManagerPhone"
              name="propertyManagerPhone"
              type="tel"
              defaultValue={profile.propertyManagerPhone}
            />
          </Field>
          <Field label="E-post" htmlFor="propertyManagerEmail">
            <Input
              id="propertyManagerEmail"
              name="propertyManagerEmail"
              type="email"
              defaultValue={profile.propertyManagerEmail}
            />
          </Field>
        </div>
      </fieldset>

      <SubmitButton>Spara namn och kontakt</SubmitButton>
    </form>
  );
}
