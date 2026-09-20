"use client";

import { useActionState } from "react";
import { updateSiteContentAction } from "./actions";
import type { FormState } from "@/lib/form";
import type { SiteContent } from "@/lib/types";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
  Textarea,
} from "@/components/ui";

export function ContentForm({ content }: { content: SiteContent }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateSiteContentAction,
    {},
  );

  return (
    <form action={action} className="space-y-5">
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <Field label="Rubrik (startsida)" htmlFor="heroTitle" required>
        <Input
          id="heroTitle"
          name="heroTitle"
          defaultValue={content.heroTitle}
          required
        />
      </Field>
      <Field label="Underrubrik (startsida)" htmlFor="heroSubtitle" required>
        <Textarea
          id="heroSubtitle"
          name="heroSubtitle"
          defaultValue={content.heroSubtitle}
          className="min-h-20"
          required
        />
      </Field>
      <Field label="Välkomsttext (startsida)" htmlFor="welcomeBody" required>
        <Textarea
          id="welcomeBody"
          name="welcomeBody"
          defaultValue={content.welcomeBody}
          className="min-h-24"
          required
        />
      </Field>
      <Field
        label="Om föreningen (brödtext)"
        htmlFor="aboutBody"
        required
        hint="Stödjer ## rubrik, - punktlista, tomrad = nytt stycke."
      >
        <Textarea
          id="aboutBody"
          name="aboutBody"
          defaultValue={content.aboutBody}
          className="min-h-56"
          required
        />
      </Field>

      <SubmitButton>Spara innehåll</SubmitButton>
    </form>
  );
}
