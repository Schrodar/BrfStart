"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { Apartment } from "@/lib/types";
import { Field, FileInput, FormError, SubmitButton } from "@/components/ui";

type UploadAction = (prev: FormState, formData: FormData) => Promise<FormState>;

export function PhotoManager({
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
      {apartment.photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {apartment.photos.map((photo) => (
            <li key={photo.id} className="relative overflow-hidden rounded-lg border border-border">
              <Image
                src={photo.url}
                alt={photo.caption || "Annonsfoto"}
                width={320}
                height={220}
                className="h-28 w-full object-cover"
              />
              <form action={removeAction} className="absolute right-1 top-1">
                <input type="hidden" name="apartmentId" value={apartment.id} />
                <input type="hidden" name="photoId" value={photo.id} />
                <button
                  type="submit"
                  className="rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white hover:bg-black/80"
                >
                  Ta bort
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Inga foton uppladdade ännu.</p>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="apartmentId" value={apartment.id} />
        {state.error ? <FormError>{state.error}</FormError> : null}
        <Field label="Lägg till foto" htmlFor="photo" hint="Bild (PNG/JPG), max 5 MB.">
          <FileInput
            id="photo"
            name="file"
            accept="image/png,image/jpeg,image/webp"
            required
          />
        </Field>
        <SubmitButton pendingText="Laddar upp…">Ladda upp foto</SubmitButton>
      </form>
    </div>
  );
}
