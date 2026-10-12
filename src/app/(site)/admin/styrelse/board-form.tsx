"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/lib/form";
import type { BoardGroup, BoardMember } from "@/lib/types";
import {
  Field,
  FormError,
  Input,
  Select,
  SubmitButton,
} from "@/components/ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function BoardForm({
  action,
  groups,
  defaults,
}: {
  action: Action;
  groups: BoardGroup[];
  defaults?: BoardMember;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <FormError>{state.error}</FormError>
      {defaults ? <input type="hidden" name="id" value={defaults.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Grupp"
          htmlFor="groupId"
          required
          hint="Grupper skapas på styrelsesidan i admin."
        >
          <Select
            id="groupId"
            name="groupId"
            required
            defaultValue={defaults?.groupId ?? groups[0]?.id ?? ""}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sorteringsordning" htmlFor="order" hint="Lägre visas först.">
          <Input
            id="order"
            name="order"
            type="number"
            min={0}
            defaultValue={defaults?.order ?? 0}
          />
        </Field>
        <Field label="Roll" htmlFor="role" required hint="T.ex. Ordförande, Kassör, Ledamot.">
          <Input id="role" name="role" defaultValue={defaults?.role} required />
        </Field>
        <Field label="Namn" htmlFor="name" required>
          <Input id="name" name="name" defaultValue={defaults?.name} required />
        </Field>
        <Field label="E-post" htmlFor="email" hint="Valfri. Visas publikt om ifylld.">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults?.email}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{defaults ? "Spara ändringar" : "Lägg till"}</SubmitButton>
        <Link
          href="/admin/styrelse"
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          Avbryt
        </Link>
      </div>
    </form>
  );
}
