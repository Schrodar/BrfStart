"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { FormState } from "@/lib/form";
import type { BuildingWithCounts } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
} from "@/components/ui";
import {
  createBuildingAction,
  deleteBuildingAction,
  reorderBuildingsAction,
  updateBuildingAction,
} from "./actions";

/**
 * Skapa, döp om, sortera och ta bort hus. Ordningen styr i vilken följd korten
 * visas i registret. Samma mönster som grupperna på styrelsesidan: dra för mus,
 * pilknappar för pekskärm och tangentbord.
 */
export function BuildingManager({ buildings }: { buildings: BuildingWithCounts[] }) {
  const [order, setOrder] = useState(buildings);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => setOrder(buildings), [buildings]);

  function persist(next: BuildingWithCounts[]) {
    setOrder(next);
    setError(undefined);
    startTransition(async () => {
      const result = await reorderBuildingsAction(next.map((b) => b.id));
      if (result.error) {
        setError(result.error);
        setOrder(buildings);
      }
    });
  }

  function reorder(fromId: string, toId: string) {
    const from = order.findIndex((b) => b.id === fromId);
    const to = order.findIndex((b) => b.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  function move(id: string, delta: number) {
    const from = order.findIndex((b) => b.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      {order.length > 0 ? (
        <ul
          className={cn(
            "divide-y divide-border overflow-hidden rounded-card border border-border bg-surface transition-opacity",
            pending && "opacity-60",
          )}
        >
          {order.map((b, i) => (
            <li
              key={b.id}
              draggable
              onDragStart={() => setDragId(b.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overId !== b.id) setOverId(b.id);
              }}
              onDragLeave={() => setOverId((id) => (id === b.id ? null : id))}
              onDrop={(e) => {
                e.preventDefault();
                setOverId(null);
                if (dragId) reorder(dragId, b.id);
              }}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3",
                dragId === b.id && "opacity-40",
                overId === b.id &&
                  dragId !== b.id &&
                  "bg-brand-50/60 ring-1 ring-inset ring-brand-500",
              )}
            >
              <span className="w-6 cursor-grab text-muted active:cursor-grabbing" aria-hidden="true">
                ⠿
              </span>
              <span className="w-6 tabular-nums text-muted">{i + 1}</span>

              <BuildingRowForm building={b} />

              <span className="ml-auto text-sm text-muted">
                {b.apartmentCount} lgh
              </span>

              <div className="flex items-center gap-1">
                <MoveButton
                  label={`Flytta ${b.name} uppåt`}
                  disabled={i === 0 || pending}
                  onClick={() => move(b.id, -1)}
                >
                  ↑
                </MoveButton>
                <MoveButton
                  label={`Flytta ${b.name} nedåt`}
                  disabled={i === order.length - 1 || pending}
                  onClick={() => move(b.id, 1)}
                >
                  ↓
                </MoveButton>
                <DeleteBuildingButton building={b} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <NewBuildingForm />
    </div>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-border px-2 py-1 text-sm text-muted hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function BuildingRowForm({ building }: { building: BuildingWithCounts }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateBuildingAction,
    {},
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={building.id} />
      <Input
        name="name"
        defaultValue={building.name}
        aria-label={`Namn på ${building.name}`}
        required
        className="w-40"
      />
      <Input
        name="address"
        defaultValue={building.address}
        aria-label={`Adress för ${building.name}`}
        placeholder="Adress (valfri)"
        className="w-44"
      />
      <Input
        name="numberStart"
        defaultValue={building.numberStart}
        aria-label={`Startnummer för ${building.name}`}
        title="Första lägenhetsnumret vid massinläggning"
        inputMode="numeric"
        className="w-24"
      />
      <label className="flex items-center gap-1.5 text-sm text-muted">
        <input
          type="checkbox"
          name="numberTopDown"
          defaultChecked={building.numberTopDown}
          className="size-4 accent-brand-600"
        />
        Uppifrån
      </label>
      <button type="submit" className="text-sm font-medium text-brand-700 hover:underline">
        Spara
      </button>
      {state.error ? (
        <span className="text-sm text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}

function DeleteBuildingButton({ building }: { building: BuildingWithCounts }) {
  const [state, action] = useActionState<FormState, FormData>(
    deleteBuildingAction,
    {},
  );
  const count = building.apartmentCount;

  // Raderingen tar med lägenheterna, deras planritningar och annonsfoton. Det
  // går inte att ångra, så be om ett aktivt ja när det finns något att förlora.
  function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
    if (count === 0) return;
    const answer = window.confirm(
      `Ta bort ${building.name} och ${count} ${count === 1 ? "lägenhet" : "lägenheter"}?

` +
        "Planritningar och annonsfoton raderas också. Det går inte att ångra.",
    );
    if (!answer) e.preventDefault();
  }

  return (
    <form action={action} onSubmit={confirmDelete} className="flex items-center gap-2">
      <input type="hidden" name="id" value={building.id} />
      <button
        aria-label={`Ta bort ${building.name}`}
        title={
          count > 0
            ? `Tar bort huset och ${count} ${count === 1 ? "lägenhet" : "lägenheter"}`
            : `Ta bort ${building.name}`
        }
        className="rounded border border-transparent px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Ta bort
      </button>
      {state.error ? (
        <span className="text-sm text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}

function NewBuildingForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createBuildingAction,
    {},
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) nameRef.current?.focus();
  }, [state]);

  return (
    <form action={action} className="space-y-3 rounded-card border border-border bg-surface p-4">
      <h3 className="font-semibold">Nytt hus</h3>
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Namn" htmlFor="new-building-name" required hint="T.ex. Hus 43, Trapphus B.">
          <Input id="new-building-name" name="name" ref={nameRef} required />
        </Field>
        <Field label="Adress" htmlFor="new-building-address" hint="Valfri, t.ex. Solvägen 43.">
          <Input id="new-building-address" name="address" />
        </Field>
        <Field
          label="Startnummer"
          htmlFor="new-building-start"
          hint="Första lägenhetsnumret. Nollor behålls: 0312 ger fyrsiffriga nummer."
        >
          <Input
            id="new-building-start"
            name="numberStart"
            defaultValue="0101"
            inputMode="numeric"
          />
        </Field>
        <Field label="Riktning" htmlFor="new-building-direction" hint="Vilken våning som får de lägsta numren.">
          <label className="flex items-center gap-2 py-2 text-sm">
            <input
              id="new-building-direction"
              type="checkbox"
              name="numberTopDown"
              className="size-4 accent-brand-600"
            />
            Börja uppifrån i stället för på bottenplan
          </label>
        </Field>
      </div>

      <SubmitButton>Lägg till hus</SubmitButton>
    </form>
  );
}
