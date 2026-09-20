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

export function ListingForm({
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
          label="Utropspris"
          htmlFor="price"
          hint="Visas som utropspris i annonsen, med en notis om att budgivningen sköts av mäklaren."
        >
          <Input
            id="price"
            name="price"
            defaultValue={apartment.price}
            placeholder="t.ex. 3 250 000 kr"
          />
        </Field>
        <Field label="Månadsavgift" htmlFor="monthlyFee">
          <Input
            id="monthlyFee"
            name="monthlyFee"
            defaultValue={apartment.monthlyFee}
            placeholder="t.ex. 3 200 kr/mån"
          />
        </Field>
      </div>

      <Field label="Visningstider" htmlFor="viewingInfo">
        <Input
          id="viewingInfo"
          name="viewingInfo"
          defaultValue={apartment.viewingInfo}
          placeholder="t.ex. Söndag 12 maj kl. 12–13"
        />
      </Field>

      <Field label="Beskrivning (annons)" htmlFor="saleDescription">
        <Textarea
          id="saleDescription"
          name="saleDescription"
          defaultValue={apartment.saleDescription}
          className="min-h-32"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Mäklare" htmlFor="brokerName">
          <Input id="brokerName" name="brokerName" defaultValue={apartment.brokerName} />
        </Field>
        <Field label="Mäklartelefon" htmlFor="brokerPhone">
          <Input
            id="brokerPhone"
            name="brokerPhone"
            defaultValue={apartment.brokerPhone}
          />
        </Field>
        <Field label="Mäklar-e-post" htmlFor="brokerEmail">
          <Input
            id="brokerEmail"
            name="brokerEmail"
            type="email"
            defaultValue={apartment.brokerEmail}
          />
        </Field>
      </div>

      <Field label="Länk till Hemnet (valfri)" htmlFor="hemnetUrl">
        <Input
          id="hemnetUrl"
          name="hemnetUrl"
          defaultValue={apartment.hemnetUrl}
          placeholder="https://www.hemnet.se/…"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="showFloorPlanPublicly"
          defaultChecked={apartment.showFloorPlanPublicly}
          className="h-4 w-4 rounded border-border"
        />
        Visa planritningen i den publika annonsen
      </label>

      <SubmitButton>Spara annons</SubmitButton>
    </form>
  );
}
