"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { Building } from "@/lib/types";
import {
  Field,
  FileInput,
  FormError,
  Input,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export interface NoticeDefaults {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  buildingId: string | null;
  pinned: boolean;
}

export function NoticeForm({
  action,
  buildings,
  today,
  defaults,
}: {
  action: Action;
  buildings: Building[];
  /** Dagens datum i svensk tid, "YYYY-MM-DD". */
  today: string;
  defaults?: NoticeDefaults;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <FormError>{state.error}</FormError>
      {defaults ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <Field label="Rubrik" htmlFor="title" required hint="Kort och tydlig – läses på några meters håll.">
        <Input id="title" name="title" defaultValue={defaults?.title} maxLength={120} required />
      </Field>

      <Field
        label="Text"
        htmlFor="body"
        hint="Några korta rader räcker. Radbrytningar syns på tavlan. Max 1 200 tecken."
      >
        <Textarea
          id="body"
          name="body"
          defaultValue={defaults?.body}
          maxLength={1200}
          className="min-h-36"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Visas från" htmlFor="startDate" required>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaults?.startDate ?? today}
            required
          />
        </Field>
        <Field label="Visas till och med" htmlFor="endDate" hint="Tomt = tills vidare.">
          <Input id="endDate" name="endDate" type="date" defaultValue={defaults?.endDate} />
        </Field>
      </div>

      <Field label="Var" htmlFor="buildingId">
        <Select id="buildingId" name="buildingId" defaultValue={defaults?.buildingId ?? ""}>
          <option value="">Alla skärmar</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              Bara {b.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Bild (valfri)"
        htmlFor="image"
        hint="Visas bredvid texten. JPG, PNG eller WebP, max 5 MB."
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
              <input type="checkbox" name="removeImage" className="h-4 w-4 rounded border-border" />
              Ta bort bilden
            </label>
          </div>
        ) : null}
        <FileInput id="image" name="image" accept="image/png,image/jpeg,image/webp" />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="pinned"
          defaultChecked={defaults?.pinned ?? false}
          className="h-4 w-4 rounded border-border"
        />
        Viktigt – visas först och markeras på tavlan
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton>{defaults ? "Spara ändringar" : "Sätt upp anslaget"}</SubmitButton>
        <Link href="/admin/tavlor" className="text-sm font-medium text-muted hover:text-foreground">
          Avbryt
        </Link>
      </div>
    </form>
  );
}
