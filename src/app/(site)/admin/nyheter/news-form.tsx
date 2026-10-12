"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { NewsPost } from "@/lib/types";
import {
  Field,
  FileInput,
  FormError,
  Input,
  SubmitButton,
  Textarea,
} from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function NewsForm({
  action,
  defaults,
}: {
  action: Action;
  defaults?: NewsPost;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <FormError>{state.error}</FormError>
      {defaults ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <Field label="Rubrik" htmlFor="title" required>
        <Input id="title" name="title" defaultValue={defaults?.title} required />
      </Field>

      <Field
        label="Ingress"
        htmlFor="excerpt"
        required
        hint="Kort sammanfattning som visas i listor."
      >
        <Textarea
          id="excerpt"
          name="excerpt"
          defaultValue={defaults?.excerpt}
          className="min-h-20"
          required
        />
      </Field>

      <Field
        label="Text"
        htmlFor="body"
        required
        hint="Stödjer enkel formatering: ## rubrik, - punktlista, tomrad = nytt stycke."
      >
        <Textarea
          id="body"
          name="body"
          defaultValue={defaults?.body}
          className="min-h-56"
          required
        />
      </Field>

      <Field
        label="Bild (valfri)"
        htmlFor="image"
        hint="Visas i nyhetslistan och överst i artikeln. Liggande format, gärna minst 1600 px brett. JPG, PNG eller WebP, max 5 MB."
      >
        {defaults?.imageUrl ? (
          <div className="mb-3 flex items-center gap-4">
            <Image
              src={defaults.imageUrl}
              alt=""
              width={160}
              height={120}
              className="h-20 w-28 rounded-lg border border-border object-cover"
            />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                name="removeImage"
                className="h-4 w-4 rounded border-border"
              />
              Ta bort bilden
            </label>
          </div>
        ) : null}
        <FileInput id="image" name="image" accept="image/png,image/jpeg,image/webp" />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          defaultChecked={defaults ? defaults.published : true}
          className="h-4 w-4 rounded border-border"
        />
        Publicerad (avmarkera för att spara som utkast)
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton>{defaults ? "Spara ändringar" : "Skapa nyhet"}</SubmitButton>
        <Link
          href="/admin/nyheter"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
