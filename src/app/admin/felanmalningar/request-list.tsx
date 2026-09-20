"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/form";
import type {
  MaintenanceCategory,
  MaintenanceEvent,
  MaintenanceRequest,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_TONE as statusTone,
  maintenanceStatusLabel as statusLabel,
} from "@/lib/maintenance-status";
import {
  Badge,
  Card,
  CardBody,
  EmptyState,
  Field,
  FormError,
  FormSuccess,
  Input,
  Select,
  SubmitButton,
  Textarea,
} from "@/components/ui";
import { updateRequestAction } from "./actions";

/**
 * Listan över ärenden. Ett klick öppnar ärendet i en modal där styrelsen kan
 * sätta status, skriva vem som ska utföra jobbet och lämna en intern notering.
 *
 * Modalen är ett <dialog> med showModal(): webbläsaren sköter fokusfällan,
 * bakgrundsspärren och Esc utan att vi bygger om det själva.
 */
export function RequestList({
  requests,
  categories,
}: {
  requests: MaintenanceRequest[];
  categories: MaintenanceCategory[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = requests.find((r) => r.id === openId) ?? null;

  if (requests.length === 0) {
    return <EmptyState title="Inga felanmälningar" />;
  }

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {requests.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setOpenId(r.id)}
              className="flex w-full items-start gap-4 px-4 py-3.5 text-left hover:bg-brand-50/60"
            >
              <Badge tone={statusTone[r.status]}>{statusLabel(r.status)}</Badge>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">
                  {r.categoryName} · {r.location}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {formatDateTime(r.createdAt)}
                  {r.assignedTo ? ` · Tilldelad: ${r.assignedTo}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium text-brand-700">
                Öppna
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open ? (
        <RequestModal
          key={open.id}
          request={open}
          category={categories.find((c) => c.id === open.categoryId) ?? null}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </>
  );
}

function RequestModal({
  request,
  category,
  onClose,
}: {
  request: MaintenanceRequest;
  category: MaintenanceCategory | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<FormState, FormData>(
    updateRequestAction,
    {},
  );

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const hasContractor =
    category &&
    (category.contractorName ||
      category.contractorPhone ||
      category.contractorEmail ||
      category.contractorInfo);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl flex-col rounded-card border border-border bg-surface p-0 shadow-xl backdrop:bg-black/40"
    >
      {/* Fast huvud – rullar inte bort när ärendet är långt. */}
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone[request.status]}>
              {statusLabel(request.status)}
            </Badge>
            <span className="font-semibold">{request.categoryName}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {formatDateTime(request.createdAt)} · {request.location}
          </p>
        </div>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Stäng"
          className="rounded px-2 py-1 text-xl leading-none text-muted hover:bg-black/5"
        >
          ×
        </button>
      </div>

      {/*
        Formuläret spänner över både den rullande mitten och den fasta foten,
        så att spara-knappen ligger kvar i vy medan innehållet rullar.
      */}
      <form action={action} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="id" value={request.id} />

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {request.description}
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            Anmäld av: {request.name || "Anonym"}
            {request.memberId ? <Badge tone="brand">Medlem</Badge> : null}
          </span>
          {request.email ? (
            <span>
              <a
                href={`mailto:${request.email}`}
                className="text-brand-700 hover:underline"
              >
                {request.email}
              </a>
            </span>
          ) : null}
          {request.phone ? (
            <span>
              <a
                href={`tel:${request.phone.replace(/\s/g, "")}`}
                className="text-brand-700 hover:underline"
              >
                {request.phone}
              </a>
            </span>
          ) : null}
        </div>

          {/* Vem som normalt sköter kategorin – underlag för tilldelningen. */}
          {hasContractor ? (
            <Card className="bg-brand-50/50">
            <CardBody className="space-y-1 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Underleverantör för {category!.name}
              </p>
              {category!.contractorName ? (
                <p className="text-sm font-medium">{category!.contractorName}</p>
              ) : null}
              <p className="flex flex-wrap gap-x-4 text-sm">
                {category!.contractorPhone ? (
                  <a
                    href={`tel:${category!.contractorPhone.replace(/\s/g, "")}`}
                    className="text-brand-700 hover:underline"
                  >
                    {category!.contractorPhone}
                  </a>
                ) : null}
                {category!.contractorEmail ? (
                  <a
                    href={`mailto:${category!.contractorEmail}`}
                    className="text-brand-700 hover:underline"
                  >
                    {category!.contractorEmail}
                  </a>
                ) : null}
              </p>
              {category!.contractorInfo ? (
                <p className="whitespace-pre-wrap text-xs text-muted">
                  {category!.contractorInfo}
                </p>
              ) : null}
            </CardBody>
          </Card>
          ) : null}

          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Field
              label="Status"
              htmlFor={`status-${request.id}`}
              hint={
                request.memberId
                  ? "Anmälaren är inloggad medlem och får besked när du ändrar status."
                  : undefined
              }
            >
              <Select
                id={`status-${request.id}`}
                name="status"
                defaultValue={request.status}
              >
                {MAINTENANCE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Vem ska utföra jobbet?"
              htmlFor={`assignedTo-${request.id}`}
              hint={
                category?.contractorName
                  ? `Förslag: ${category.contractorName}`
                  : "Namn på person eller firma."
              }
            >
              <Input
                id={`assignedTo-${request.id}`}
                name="assignedTo"
                defaultValue={request.assignedTo}
                placeholder={category?.contractorName || undefined}
              />
            </Field>
          </div>

          <Timeline events={request.events} />

          <Field
            label="Ny notering"
            htmlFor={`note-${request.id}`}
            hint="Läggs till överst i historiken. Syns bara för styrelsen."
          >
            <Textarea
              id={`note-${request.id}`}
              name="note"
              rows={3}
              placeholder="Fastighetsansvarig kontaktade Kone 2026-09-08, de återkommer via e-post."
            />
          </Field>
        </div>

        {/* Fast fot – knappen ligger aldrig under rullningen. */}
        <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface px-6 py-4">
          <SubmitButton>Spara ärendet</SubmitButton>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="text-sm font-medium text-muted hover:text-foreground"
          >
            Stäng
          </button>
        </div>
      </form>
    </dialog>
  );
}

/**
 * Ärendets historik, nyast först. Raderna skrivs bara till – en sparad
 * notering går inte att ändra i efterhand, vilket är hela poängen med att ha
 * en logg i stället för ett fält.
 */
function Timeline({ events }: { events: MaintenanceEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Historik</h4>
        <p className="mt-1 text-sm text-muted">
          Inget har hänt med ärendet ännu. Din första notering hamnar här.
        </p>
      </div>
    );
  }

  const newestFirst = [...events].reverse();

  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-sm font-semibold">
        Historik{" "}
        <span className="font-normal text-muted">({events.length})</span>
      </h4>
      <ol className="mt-3 space-y-3">
        {newestFirst.map((e) => (
          <li key={e.id} className="border-l-2 border-border pl-3">
            <p className="text-xs text-muted">
              {formatDateTime(e.createdAt)}
              {e.author ? ` · ${e.author}` : ""}
            </p>
            {e.statusTo ? (
              <p className="mt-0.5 text-xs font-medium text-brand-700">
                Status: {e.statusFrom ? statusLabel(e.statusFrom) : "–"} →{" "}
                {statusLabel(e.statusTo)}
              </p>
            ) : null}
            {e.body ? (
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {e.body}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
