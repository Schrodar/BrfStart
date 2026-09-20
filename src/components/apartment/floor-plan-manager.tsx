"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { Apartment } from "@/lib/types";
import {
  Field,
  FileInput,
  FormError,
  FormSuccess,
  SubmitButton,
} from "@/components/ui";

type UploadAction = (prev: FormState, formData: FormData) => Promise<FormState>;

export function FloorPlanManager({
  apartment,
  uploadAction,
  removeAction,
}: {
  apartment: Apartment;
  uploadAction: UploadAction;
  removeAction: (formData: FormData) => Promise<void>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    uploadAction,
    {},
  );

  return (
    <div className="space-y-4">
      {apartment.floorPlanUrl ? (
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={apartment.floorPlanUrl}
            target="_blank"
            rel="noopener"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Visa nuvarande planritning →
          </a>
          <form action={removeAction}>
            <input type="hidden" name="apartmentId" value={apartment.id} />
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Ta bort
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-muted">Ingen planritning uppladdad ännu.</p>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="apartmentId" value={apartment.id} />
        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
        <Field
          label={apartment.floorPlanUrl ? "Ersätt planritning" : "Ladda upp planritning"}
          htmlFor="file"
          hint="Bild (PNG/JPG) eller PDF, max 10 MB."
        >
          <FileInput
            id="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            required
          />
        </Field>
        <SubmitButton pendingText="Laddar upp…">Ladda upp</SubmitButton>
      </form>
    </div>
  );
}
