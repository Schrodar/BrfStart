"use client";

import { useActionState, useState } from "react";
import { REFRESH_OPTIONS } from "@/lib/board";
import type { DisplaySettings } from "@/lib/data/displays";
import type { FormState } from "@/lib/form";
import { Field, FormError, FormSuccess, Input, Select, SubmitButton } from "@/components/ui";
import { updateDisplaySettingsAction } from "./actions";

export function DisplaySettingsForm({ settings }: { settings: DisplaySettings }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateDisplaySettingsAction,
    {},
  );
  const nightOn = settings.nightStart !== settings.nightEnd;
  const [nightOff, setNightOff] = useState(nightOn);

  return (
    <form action={formAction} className="space-y-4">
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.success}</FormSuccess>

      <Field
        label="Uppdatera skärmarna"
        htmlFor="refreshMinutes"
        hint="Hur ofta skärmarna hämtar nya anslag. Klockan på skärmen går rätt oavsett – den hämtas aldrig härifrån."
        className="max-w-sm"
      >
        <Select id="refreshMinutes" name="refreshMinutes" defaultValue={String(settings.refreshMinutes)}>
          {REFRESH_OPTIONS.map((o) => (
            <option key={o.minutes} value={o.minutes}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="showNews"
          defaultChecked={settings.showNews}
          className="h-4 w-4 rounded border-border"
        />
        Visa de två senaste nyheterna från webbplatsen under anslagen
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="nightOff"
          checked={nightOff}
          onChange={(e) => setNightOff(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Släck skärmarna nattetid (de hämtar då heller inget nytt förrän de tänds)
      </label>

      {nightOff ? (
        <div className="grid max-w-sm grid-cols-2 gap-4">
          <Field label="Släck från" htmlFor="nightStart">
            <Input
              id="nightStart"
              name="nightStart"
              type="time"
              defaultValue={nightOn ? settings.nightStart : "23:00"}
              required
            />
          </Field>
          <Field label="Tänd igen" htmlFor="nightEnd">
            <Input
              id="nightEnd"
              name="nightEnd"
              type="time"
              defaultValue={nightOn ? settings.nightEnd : "06:00"}
              required
            />
          </Field>
        </div>
      ) : (
        <>
          <input type="hidden" name="nightStart" value="00:00" />
          <input type="hidden" name="nightEnd" value="00:00" />
        </>
      )}

      <SubmitButton pendingText="Sparar…">Spara inställningar</SubmitButton>
    </form>
  );
}
