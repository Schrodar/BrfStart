"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { FormState } from "@/lib/form";
import type { MaintenanceCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
  reorderCategoriesAction,
} from "./actions";

type Row = MaintenanceCategory & { requestCount: number };

/**
 * Kategorierna i felanmälningsformuläret. Ordningen styr rullgardinen på den
 * publika sidan. Samma mönster som hus och styrelsegrupper: dra med mus,
 * pilknappar för pekskärm och tangentbord.
 */
export function CategoryManager({ categories }: { categories: Row[] }) {
  const [order, setOrder] = useState(categories);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => setOrder(categories), [categories]);

  function persist(next: Row[]) {
    setOrder(next);
    setError(undefined);
    startTransition(async () => {
      const result = await reorderCategoriesAction(next.map((c) => c.id));
      if (result.error) {
        setError(result.error);
        setOrder(categories);
      }
    });
  }

  function moveTo(fromId: string, toId: string) {
    const from = order.findIndex((c) => c.id === fromId);
    const to = order.findIndex((c) => c.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...order];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    persist(next);
  }

  function step(id: string, delta: number) {
    const from = order.findIndex((c) => c.id === id);
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
          {order.map((c, i) => (
            <li
              key={c.id}
              draggable
              onDragStart={() => setDragId(c.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (overId !== c.id) setOverId(c.id);
              }}
              onDragLeave={() => setOverId((id) => (id === c.id ? null : id))}
              onDrop={(e) => {
                e.preventDefault();
                setOverId(null);
                if (dragId) moveTo(dragId, c.id);
              }}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3",
                dragId === c.id && "opacity-40",
                overId === c.id &&
                  dragId !== c.id &&
                  "bg-brand-50/60 ring-1 ring-inset ring-brand-500",
              )}
            >
              <span
                className="w-5 cursor-grab text-muted active:cursor-grabbing"
                aria-hidden="true"
              >
                ⠿
              </span>
              <span className="w-5 tabular-nums text-muted">{i + 1}</span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <RenameForm category={c} />

                  <span className="ml-auto text-sm text-muted">
                    {c.requestCount} {c.requestCount === 1 ? "ärende" : "ärenden"}
                  </span>

                  <div className="flex items-center gap-1">
                    <StepButton
                      label={`Flytta ${c.name} uppåt`}
                      disabled={i === 0 || pending}
                      onClick={() => step(c.id, -1)}
                    >
                      ↑
                    </StepButton>
                    <StepButton
                      label={`Flytta ${c.name} nedåt`}
                      disabled={i === order.length - 1 || pending}
                      onClick={() => step(c.id, 1)}
                    >
                      ↓
                    </StepButton>
                    <DeleteButton category={c} />
                  </div>
                </div>

                <ContractorBox category={c} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Inga kategorier ännu. Utan kategorier går det inte att skicka en
          felanmälan – lägg till minst en nedan.
        </p>
      )}

      <NewCategoryForm />
    </div>
  );
}

function StepButton({
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

function RenameForm({ category }: { category: Row }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateCategoryAction,
    {},
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={category.id} />
      <Input
        name="name"
        defaultValue={category.name}
        aria-label={`Namn på ${category.name}`}
        required
        className="w-56"
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

function DeleteButton({ category }: { category: Row }) {
  const [state, action] = useActionState<FormState, FormData>(
    deleteCategoryAction,
    {},
  );
  const blocked = category.requestCount > 0;

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={category.id} />
      <button
        aria-label={`Ta bort ${category.name}`}
        disabled={blocked}
        title={
          blocked
            ? "Kategorin används av inkomna ärenden – byt kategori på dem först."
            : `Ta bort ${category.name}`
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

function NewCategoryForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createCategoryAction,
    {},
  );
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.success) nameRef.current?.focus();
  }, [state]);

  return (
    <form
      action={action}
      className="space-y-3 rounded-card border border-border bg-surface p-4"
    >
      <h3 className="font-semibold">Ny kategori</h3>
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <Field
        label="Namn"
        htmlFor="new-category-name"
        required
        hint="T.ex. Garage, Sopsortering, Laddstolpar."
      >
        <Input
          id="new-category-name"
          name="name"
          ref={nameRef}
          required
          className="max-w-sm"
        />
      </Field>

      <SubmitButton>Lägg till kategori</SubmitButton>
    </form>
  );
}

/**
 * Underleverantören som hanterar kategorin. Ihopfälld som standard – det är
 * uppgifter man sätter en gång och sedan sällan rör. Visas bara i admin och i
 * ärendemodalen, aldrig publikt.
 */
function ContractorBox({ category }: { category: Row }) {
  const [state, action] = useActionState<FormState, FormData>(
    updateCategoryAction,
    {},
  );
  const filled = Boolean(
    category.contractorName ||
      category.contractorPhone ||
      category.contractorEmail ||
      category.contractorInfo,
  );

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm text-brand-700 hover:underline">
        Underleverantör
        {filled ? (
          <span className="ml-1 text-muted">
            – {category.contractorName || category.contractorPhone}
          </span>
        ) : (
          <span className="ml-1 text-muted">– inte ifylld</span>
        )}
      </summary>

      <form action={action} className="mt-3 space-y-3 rounded-lg bg-brand-50/40 p-3">
        <input type="hidden" name="id" value={category.id} />
        <input type="hidden" name="name" value={category.name} />
        {state.error ? <FormError>{state.error}</FormError> : null}
        {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Företag / person" htmlFor={`cn-${category.id}`}>
            <Input
              id={`cn-${category.id}`}
              name="contractorName"
              defaultValue={category.contractorName}
            />
          </Field>
          <Field label="Telefon" htmlFor={`cp-${category.id}`}>
            <Input
              id={`cp-${category.id}`}
              name="contractorPhone"
              defaultValue={category.contractorPhone}
            />
          </Field>
          <Field label="E-post" htmlFor={`ce-${category.id}`}>
            <Input
              id={`ce-${category.id}`}
              name="contractorEmail"
              type="email"
              defaultValue={category.contractorEmail}
            />
          </Field>
        </div>

        <Field
          label="Övrigt"
          htmlFor={`ci-${category.id}`}
          hint="Avtalsnummer, jourtider, fler leverantörer."
        >
          <Textarea
            id={`ci-${category.id}`}
            name="contractorInfo"
            rows={2}
            defaultValue={category.contractorInfo}
          />
        </Field>

        <SubmitButton>Spara underleverantör</SubmitButton>
      </form>
    </details>
  );
}
