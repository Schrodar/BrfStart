"use client";

import { useActionState, useState } from "react";
import type { Building } from "@/lib/types";
import {
  Button,
  Field,
  FormError,
  Input,
  Select,
  SubmitButton,
} from "@/components/ui";
import {
  createDisplayAction,
  regenerateDisplayTokenAction,
  type DisplayLinkState,
} from "./actions";

/** Skärmens adress, som bara visas direkt efter att den skapats. */
function LinkBox({ state }: { state: DisplayLinkState }) {
  const [copied, setCopied] = useState(false);
  if (!state.url) return null;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground">
        Adressen till {state.name ? `”${state.name}”` : "skärmen"}:
      </p>
      <code className="block break-all rounded bg-surface px-3 py-2 text-xs">{state.url}</code>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(state.url ?? "");
            setCopied(true);
          }}
        >
          {copied ? "Kopierad" : "Kopiera adress"}
        </Button>
      </div>
      <p className="text-xs text-muted">
        Lägg in adressen i skärmens inställningar (TAVLA_URL). Den visas bara nu – tappar du
        bort den, välj ”Ny adress” på skärmen.
      </p>
    </div>
  );
}

export function NewDisplayForm({ buildings }: { buildings: Building[] }) {
  const [state, formAction] = useActionState<DisplayLinkState, FormData>(
    createDisplayAction,
    {},
  );
  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <FormError>{state.error}</FormError>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Namn" htmlFor="display-name" required hint="T.ex. ”Uppgång B” eller ”Port 43”.">
            <Input id="display-name" name="name" required maxLength={80} autoComplete="off" />
          </Field>
          <Field label="Hus" htmlFor="display-building" hint="Styr adressen på tavlan och vilka anslag som visas.">
            <Select id="display-building" name="buildingId" defaultValue="">
              <option value="">Inget särskilt hus</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <SubmitButton pendingText="Skapar…">Lägg till skärm</SubmitButton>
      </form>
      <LinkBox state={state} />
    </div>
  );
}

/** "Ny adress" för en befintlig skärm – den gamla slutar fungera direkt. */
export function RegenerateTokenForm({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState<DisplayLinkState, FormData>(
    regenerateDisplayTokenAction,
    {},
  );
  return (
    <div className="space-y-3">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm(`Ge ”${name}” en ny adress? Den gamla slutar fungera direkt.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="name" value={name} />
        <button type="submit" className="font-medium text-brand-700 hover:underline">
          Ny adress
        </button>
      </form>
      <FormError>{state.error}</FormError>
      <LinkBox state={state} />
    </div>
  );
}
