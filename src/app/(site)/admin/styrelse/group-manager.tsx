"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormState } from "@/lib/form";
import type { BoardGroupWithMembers } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
} from "@/components/ui";
import {
  createBoardGroupAction,
  deleteBoardGroupAction,
  renameBoardGroupAction,
  reorderBoardGroupsAction,
} from "./actions";

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <circle cx="6" cy="3" r="1.3" />
      <circle cx="10" cy="3" r="1.3" />
      <circle cx="6" cy="8" r="1.3" />
      <circle cx="10" cy="8" r="1.3" />
      <circle cx="6" cy="13" r="1.3" />
      <circle cx="10" cy="13" r="1.3" />
    </svg>
  );
}

/**
 * Skapa, döpa om, sortera och ta bort grupper.
 *
 * Ordningen ändras genom att dra raderna. Pilknapparna gör samma sak och finns
 * för att HTML5-drag inte fungerar på pekskärm och inte går att nå med
 * tangentbord. Positionerna skrivs alltid om till 1..n, så numren är en obruten
 * följd oavsett vad som stod där innan.
 */
export function GroupManager({ groups }: { groups: BoardGroupWithMembers[] }) {
  const [order, setOrder] = useState(groups);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  // Servern är sanningen: efter en revalidering (namnbyte, ny grupp, sparad
  // ordning) kommer nya props och ersätter den lokala listan.
  useEffect(() => setOrder(groups), [groups]);

  function persist(next: BoardGroupWithMembers[]) {
    setOrder(next);
    setError(undefined);
    startTransition(async () => {
      const result = await reorderBoardGroupsAction(next.map((g) => g.id));
      if (result.error) {
        setError(result.error);
        setOrder(groups); // rulla tillbaka till serverns version
      }
    });
  }

  function move(id: string, delta: number) {
    const from = order.findIndex((g) => g.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = order.findIndex((g) => g.id === dragId);
    const to = order.findIndex((g) => g.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  return (
    <div className="space-y-4">
      {error ? <FormError>{error}</FormError> : null}

      <div
        className={cn(
          "overflow-hidden rounded-card border border-border bg-surface transition-opacity",
          pending && "opacity-60",
        )}
      >
        <div className="flex items-center gap-4 border-b border-border px-4 py-3 text-sm text-muted">
          <span className="w-6" />
          <span className="w-8">#</span>
          <span className="flex-1">Namn</span>
          <span className="w-20 text-right">Personer</span>
          <span className="w-32 text-right">Åtgärd</span>
        </div>

        <ul className="divide-y divide-border">
          {order.map((group, i) => (
            <li
              key={group.id}
              draggable
              onDragStart={() => setDragId(group.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overId !== group.id) setOverId(group.id);
              }}
              onDragLeave={() => setOverId((id) => (id === group.id ? null : id))}
              onDrop={(e) => {
                e.preventDefault();
                setOverId(null);
                drop(group.id);
              }}
              className={cn(
                "flex items-center gap-4 px-4 py-2.5",
                dragId === group.id && "opacity-40",
                overId === group.id &&
                  dragId !== group.id &&
                  "bg-brand-50/60 ring-1 ring-inset ring-brand-500",
              )}
            >
              <span
                className="w-6 cursor-grab text-muted active:cursor-grabbing"
                aria-hidden="true"
              >
                <DragHandleIcon />
              </span>
              <span className="w-8 tabular-nums text-muted">{i + 1}</span>

              <div className="flex-1">
                <RenameForm group={group} />
              </div>

              <span className="w-20 text-right text-sm text-muted">
                {group.members.length}
              </span>

              <div className="flex w-32 items-center justify-end gap-1">
                <MoveButton
                  label={`Flytta ${group.name} uppåt`}
                  disabled={i === 0 || pending}
                  onClick={() => move(group.id, -1)}
                >
                  ↑
                </MoveButton>
                <MoveButton
                  label={`Flytta ${group.name} nedåt`}
                  disabled={i === order.length - 1 || pending}
                  onClick={() => move(group.id, 1)}
                >
                  ↓
                </MoveButton>
                <DeleteButton group={group} />
              </div>
            </li>
          ))}

          {order.length === 0 ? (
            <li className="px-4 py-6 text-center text-muted">
              Inga grupper ännu. Skapa den första nedan.
            </li>
          ) : null}
        </ul>
      </div>

      {order.length > 1 ? (
        <p className="text-xs text-muted">
          Dra raderna för att ändra ordningen, eller använd pilknapparna.
          Ordningen styr hur grupperna visas på styrelsesidan.
        </p>
      ) : null}

      <NewGroupForm />
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

function RenameForm({ group }: { group: BoardGroupWithMembers }) {
  const [state, action] = useActionState<FormState, FormData>(
    renameBoardGroupAction,
    {},
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={group.id} />
      <Input
        name="name"
        defaultValue={group.name}
        aria-label={`Namn på gruppen ${group.name}`}
        required
        className="max-w-xs"
      />
      <button
        type="submit"
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        Spara
      </button>
      {state.error ? (
        <span className="text-sm text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}

function DeleteButton({ group }: { group: BoardGroupWithMembers }) {
  const [state, action] = useActionState<FormState, FormData>(
    deleteBoardGroupAction,
    {},
  );
  const blocked = group.members.length > 0;

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={group.id} />
      <button
        aria-label={`Ta bort gruppen ${group.name}`}
        disabled={blocked}
        title={
          blocked
            ? "Gruppen innehåller personer – flytta dem först."
            : `Ta bort ${group.name}`
        }
        className="rounded border border-transparent px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Ta bort
      </button>
      {state.error ? (
        <span className="text-sm text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}

function NewGroupForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createBoardGroupAction,
    {},
  );
  const nameRef = useRef<HTMLInputElement>(null);

  // Efter en lyckad skapning tömmer React fältet – ge fokus tillbaka så att
  // flera grupper går att lägga till i rad.
  useEffect(() => {
    if (state.success) nameRef.current?.focus();
  }, [state]);

  return (
    <form
      action={action}
      className="space-y-3 rounded-card border border-border bg-surface p-4"
    >
      <h3 className="font-semibold">Ny grupp</h3>
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <Field
        label="Namn"
        htmlFor="new-group-name"
        required
        hint="T.ex. Trädgårdsgruppen, Festkommittén. Nya grupper hamnar sist."
      >
        <Input id="new-group-name" name="name" ref={nameRef} required className="max-w-sm" />
      </Field>

      <SubmitButton>Lägg till grupp</SubmitButton>
    </form>
  );
}
