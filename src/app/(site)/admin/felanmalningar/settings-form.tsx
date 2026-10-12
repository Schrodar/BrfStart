"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { MaintenanceSettings } from "@/lib/types";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import { updateSettingsAction } from "./actions";

/**
 * Texterna och numren som visas överst på felanmälningssidan.
 *
 * Tomt telefonnummer döljer hela rutan på den publika sidan – det är så en
 * förening utan jouravtal eller utan fastighetsskötare stänger av dem.
 */
export function SettingsForm({ settings }: { settings: MaintenanceSettings }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateSettingsAction,
    {},
  );

  return (
    <form action={action} className="space-y-6">
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <Field
        label="Förklaring högst upp"
        htmlFor="introText"
        hint="Vad som är föreningens ansvar och vad den boende svarar för själv."
      >
        <Textarea
          id="introText"
          name="introText"
          rows={4}
          defaultValue={settings.introText}
        />
      </Field>

      <div className="space-y-3 rounded-card border border-border p-4">
        <div>
          <h3 className="font-semibold">Jour vid akuta fel</h3>
          <p className="text-sm text-muted">
            Visas på Felanmälan och Kontakt. Lämna telefonnumret tomt om
            föreningen inte har någon jour – då visas rutan inte alls.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jourtelefon" htmlFor="emergencyPhone">
            <Input
              id="emergencyPhone"
              name="emergencyPhone"
              defaultValue={settings.emergencyPhone}
              placeholder="Lämna tomt för att dölja"
            />
          </Field>
          <Field label="Text" htmlFor="emergencyText">
            <Input
              id="emergencyText"
              name="emergencyText"
              defaultValue={settings.emergencyText}
            />
          </Field>
        </div>
      </div>

      <div className="space-y-3 rounded-card border border-border p-4">
        <div>
          <h3 className="font-semibold">Fastighetsskötare</h3>
          <p className="text-sm text-muted">
            Visas på Felanmälan och Kontakt. Lämna telefonnumret tomt om
            föreningen inte har någon – då visas rutan inte alls.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Namn / företag" htmlFor="caretakerName">
            <Input
              id="caretakerName"
              name="caretakerName"
              defaultValue={settings.caretakerName}
            />
          </Field>
          <Field label="Telefon" htmlFor="caretakerPhone">
            <Input
              id="caretakerPhone"
              name="caretakerPhone"
              defaultValue={settings.caretakerPhone}
              placeholder="Lämna tomt för att dölja"
            />
          </Field>
        </div>
        <Field
          label="Text"
          htmlFor="caretakerText"
          hint="Här förklarar du att tjänsten ligger utanför styrelsen och kostar pengar."
        >
          <Textarea
            id="caretakerText"
            name="caretakerText"
            rows={3}
            defaultValue={settings.caretakerText}
          />
        </Field>
      </div>

      <SubmitButton>Spara inställningar</SubmitButton>
    </form>
  );
}
