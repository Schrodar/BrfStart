"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { NewsPost } from "@/lib/types";
import {
  Field,
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
