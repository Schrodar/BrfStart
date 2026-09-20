"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createDocumentAction } from "./actions";
import { documentPlacements } from "@/lib/document-pages";
import type { FormState } from "@/lib/form";
import type { DocumentCategory, DocumentVisibility } from "@/lib/types";
import { guessDocumentCategory, listText, titleFromFileName } from "@/lib/utils";
import {
  Field,
  FormError,
  FormSuccess,
  FileInput,
  Input,
  Select,
  SubmitButton,
} from "@/components/ui";

/**
 * Två inputs krävs egentligen: filen och synligheten. Titel och kategori är
 * presentation och förifylls ur filnamnet – men bara så länge administratören
 * inte själv har rört fältet, annars skulle ett filbyte skriva över ett
 * medvetet val.
 *
 * Fälten är okontrollerade så att React kan tömma formuläret efter en lyckad
 * uppladdning; förslagen skrivs direkt till DOM-noderna via refs. Kategori och
 * synlighet speglas dessutom i state, men bara för raden "Syns på".
 */

export function DocumentForm({
  categories,
}: {
  categories: { value: string; label: string }[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    createDocumentAction,
    {},
  );

  const titleRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const titleTouched = useRef(false);
  const categoryTouched = useRef(false);
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [visibility, setVisibility] = useState<DocumentVisibility>("public");

  // Nytt actionsvar = formuläret har skickats. Vid lyckad uppladdning tömmer
  // React fälten, så "har rört fältet" måste nollställas i samma veva.
  useEffect(() => {
    if (state.success) {
      titleTouched.current = false;
      categoryTouched.current = false;
      setCategory("");
      setVisibility("public");
    }
  }, [state]);

  function onFileChange(file: File | undefined) {
    if (!file) return;
    if (!titleTouched.current && titleRef.current) {
      titleRef.current.value = titleFromFileName(file.name);
    }
    if (!categoryTouched.current && categoryRef.current) {
      const guess = guessDocumentCategory(file.name);
      categoryRef.current.value = guess;
      setCategory(guess);
    }
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Fil"
          htmlFor="file"
          required
          hint="PDF eller bild, max 10 MB."
        >
          <FileInput
            id="file"
            name="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            required
            onChange={(e) => onFileChange(e.target.files?.[0])}
          />
        </Field>
        <Field
          label="Synlighet"
          htmlFor="visibility"
          required
          hint="Interna dokument kan bara laddas ner av inloggade medlemmar."
        >
          <Select
            id="visibility"
            name="visibility"
            defaultValue="public"
            onChange={(e) =>
              setVisibility(e.target.value as DocumentVisibility)
            }
          >
            <option value="public">Publik (alla)</option>
            <option value="member">Endast medlemmar</option>
          </Select>
        </Field>
        <Field
          label="Titel"
          htmlFor="title"
          required
          hint="Föreslås utifrån filnamnet – ändra fritt."
        >
          <Input
            id="title"
            name="title"
            required
            ref={titleRef}
            defaultValue=""
            onChange={() => {
              titleTouched.current = true;
            }}
          />
        </Field>
        <Field
          label="Kategori"
          htmlFor="category"
          required
          hint="Gissas utifrån filnamnet – ändra fritt."
        >
          <Select
            id="category"
            name="category"
            required
            ref={categoryRef}
            defaultValue=""
            onChange={(e) => {
              categoryTouched.current = true;
              setCategory(e.target.value as DocumentCategory);
            }}
          >
            <option value="" disabled>
              Välj…
            </option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Samma koppling som sidornas filter (DOCUMENT_PAGES) – så att det är
          tydligt att ett uppladdat dokument kan synas på flera sidor. */}
      {category ? (
        <p className="text-sm text-muted">
          Syns på:{" "}
          <span className="font-medium text-foreground">
            {listText(documentPlacements(category, visibility))}
          </span>
          .
        </p>
      ) : null}

      <SubmitButton pendingText="Laddar upp…">Lägg till dokument</SubmitButton>
    </form>
  );
}
