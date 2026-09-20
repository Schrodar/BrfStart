"use client";

import { useActionState } from "react";
import { updateAssociationInfoAction } from "./actions";
import type { FormState } from "@/lib/form";
import type { AssociationInfo } from "@/lib/types";
import {
  Field,
  FormSuccess,
  Input,
  SubmitButton,
  Textarea,
} from "@/components/ui";

export function InfoForm({ info }: { info: AssociationInfo }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateAssociationInfoAction,
    {},
  );

  return (
    <form action={action} className="space-y-6">
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Byggår" htmlFor="builtYear">
          <Input
            id="builtYear"
            name="builtYear"
            type="number"
            defaultValue={info.builtYear}
          />
        </Field>
        <Field label="Antal lägenheter" htmlFor="apartments">
          <Input
            id="apartments"
            name="apartments"
            type="number"
            defaultValue={info.apartments}
          />
        </Field>
        <Field label="Föreningsform" htmlFor="associationType">
          <Input
            id="associationType"
            name="associationType"
            defaultValue={info.associationType}
          />
        </Field>
        <Field label="Mark" htmlFor="landOwnership">
          <Input
            id="landOwnership"
            name="landOwnership"
            defaultValue={info.landOwnership}
          />
        </Field>
        <Field label="Uppvärmning" htmlFor="heating">
          <Input id="heating" name="heating" defaultValue={info.heating} />
        </Field>
        <Field label="Bredband/TV" htmlFor="broadband">
          <Input
            id="broadband"
            name="broadband"
            defaultValue={info.broadband}
          />
        </Field>
        <Field label="Parkering" htmlFor="parking">
          <Input id="parking" name="parking" defaultValue={info.parking} />
        </Field>
        <Field label="Tvätt" htmlFor="laundry">
          <Input id="laundry" name="laundry" defaultValue={info.laundry} />
        </Field>
        <Field label="Gemensamma utrymmen" htmlFor="commonAreas">
          <Input
            id="commonAreas"
            name="commonAreas"
            defaultValue={info.commonAreas}
          />
        </Field>
        <Field label="Energiklass" htmlFor="energyClass">
          <Input
            id="energyClass"
            name="energyClass"
            defaultValue={info.energyClass}
          />
        </Field>
      </div>

      <Field label="Husdjur / andrahandsuthyrning" htmlFor="pets">
        <Textarea id="pets" name="pets" defaultValue={info.pets} className="min-h-20" />
      </Field>
      <Field label="Avgift – vad ingår" htmlFor="feesInfo">
        <Textarea
          id="feesInfo"
          name="feesInfo"
          defaultValue={info.feesInfo}
          className="min-h-20"
        />
      </Field>
      <Field label="Ekonomi (sammanfattning)" htmlFor="economySummary">
        <Textarea
          id="economySummary"
          name="economySummary"
          defaultValue={info.economySummary}
          className="min-h-20"
        />
      </Field>
      <Field
        label="Genomförda renoveringar"
        htmlFor="renovationsDone"
        hint="En per rad."
      >
        <Textarea
          id="renovationsDone"
          name="renovationsDone"
          defaultValue={info.renovationsDone.join("\n")}
        />
      </Field>
      <Field
        label="Planerat underhåll"
        htmlFor="renovationsPlanned"
        hint="En per rad."
      >
        <Textarea
          id="renovationsPlanned"
          name="renovationsPlanned"
          defaultValue={info.renovationsPlanned.join("\n")}
        />
      </Field>

      <SubmitButton>Spara föreningsinfo</SubmitButton>
    </form>
  );
}
