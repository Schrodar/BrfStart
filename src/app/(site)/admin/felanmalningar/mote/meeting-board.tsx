"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/form";
import type { MaintenanceCategory, MaintenanceRequest } from "@/lib/types";
import {
  MAINTENANCE_STATUS_TONE as statusTone,
  maintenanceNumberLabel,
  maintenanceStatusLabel as statusLabel,
} from "@/lib/maintenance-status";
import { formatMaintenanceProtocol } from "@/lib/maintenance-summary";
import { CopyButton } from "@/components/maintenance/copy-button";
import {
  Badge,
  EmptyState,
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
} from "@/components/ui";
import { cn, formatDate } from "@/lib/utils";
import { updateRequestAction } from "../actions";
import { ReplyEmailButton, RequestFields } from "../request-fields";
import { Timeline } from "../request-list";

/** Den här månaden som "ÅÅÅÅ-MM" i webbläsarens tidszon. */
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Tolkar det som skrivits i månadsfältet. Bara år och månad godtas –
 * "2026-10" eller "2026-1" – och svaret är alltid "ÅÅÅÅ-MM". Allt annat ger
 * null, så att ett felskrivet värde aldrig når datumberäkningarna.
 *
 * Behövs eftersom alla webbläsare inte har en månadsväljare: i t.ex. Firefox
 * blir type="month" en vanlig textruta där vad som helst kan skrivas.
 */
function parseMonth(value: string): string | null {
  const match = /^\s*(\d{4})\s*-\s*(\d{1,2})\s*$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "ÅÅÅÅ-MM" → första och sista ögonblicket i månaden, lokal tid. */
function monthRange(value: string): { start: Date; end: Date } {
  const [y, m] = value.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 1, 0, 0, 0, -1),
  };
}

const monthName = new Intl.DateTimeFormat("sv-SE", {
  month: "long",
  year: "numeric",
});

/** När ärendet senast fick status Åtgärdat. null om det inte är åtgärdat. */
function closedAt(r: MaintenanceRequest): number | null {
  if (r.status !== "atgardad") return null;
  const event = r.events.findLast((e) => e.statusTo === "atgardad");
  return new Date(event?.createdAt ?? r.createdAt).getTime();
}

/**
 * Månadens ärenden: allt som kommit in fram till och med månaden, utom det som
 * åtgärdades en tidigare månad. Ett ärende som inte satts till Åtgärdat följer
 * alltså med till nästa månad, och nästa, tills det är klart.
 *
 * Ordningen är den ärendena kom in i – äldst först. Ingen annan sortering:
 * styrelsen går igenom listan uppifrån och ner.
 */
function monthRequests(
  requests: MaintenanceRequest[],
  month: string,
): MaintenanceRequest[] {
  const { start, end } = monthRange(month);
  return requests
    .filter((r) => {
      if (new Date(r.createdAt).getTime() > end.getTime()) return false;
      const closed = closedAt(r);
      return closed === null || closed >= start.getTime();
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function MeetingBoard({
  requests,
  categories,
}: {
  requests: MaintenanceRequest[];
  categories: MaintenanceCategory[];
}) {
  // Månaden sätts först i webbläsaren – servern vet inte vilken dag det är
  // hos den som tittar, och olika värden skulle ge fel vid hydrering.
  // `month` är alltid giltig; `draft` är det som står i fältet just nu. Skrivs
  // något felaktigt ligger listan kvar på den senaste giltiga månaden.
  const [month, setMonth] = useState("");
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const now = currentMonth();
    setMonth(now);
    setDraft(now);
  }, []);

  if (!month) return null;

  const invalid = draft !== "" && parseMonth(draft) === null;

  const { start } = monthRange(month);
  const items = monthRequests(requests, month);
  const label = monthName.format(start);

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-card border border-border bg-surface px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Field label="Månad" htmlFor="meeting-month" className="relative w-48">
            <Input
              id="meeting-month"
              type="month"
              placeholder="ÅÅÅÅ-MM"
              value={draft}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "meeting-month-error" : undefined}
              className={cn(invalid && "border-red-500 focus:border-red-500 focus:ring-red-200")}
              onChange={(e) => {
                setDraft(e.target.value);
                const parsed = parseMonth(e.target.value);
                if (parsed) setMonth(parsed);
              }}
              // Ett giltigt värde skrivs om till ÅÅÅÅ-MM när man lämnar fältet.
              onBlur={() => {
                const parsed = parseMonth(draft);
                if (parsed) setDraft(parsed);
              }}
            />
            {invalid ? (
              <div
                id="meeting-month-error"
                role="alert"
                className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-red-200 bg-white p-3 text-sm shadow-lg"
              >
                {/* Liten pil upp mot fältet. */}
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 left-5 size-3 rotate-45 border-l border-t border-red-200 bg-white"
                />
                <p className="font-medium text-red-700">Skriv bara år och månad</p>
                <p className="mt-1 text-muted">
                  Till exempel <strong className="text-foreground">2026-10</strong>{" "}
                  för oktober 2026. Listan visar {monthName.format(monthRange(month).start)}{" "}
                  tills månaden är rätt ifylld.
                </p>
              </div>
            ) : null}
          </Field>
          <CopyButton
            variant="primary"
            size="md"
            label={`Kopiera protokolltext (${items.length} ${items.length === 1 ? "ärende" : "ärenden"})`}
            disabled={items.length === 0}
            getText={() => formatMaintenanceProtocol(items, { since: start })}
          />
        </div>
        <div className="space-y-1.5 text-sm text-muted">
          <p>
            Här står felanmälningarna för {label}, i den ordning de kom in. Hantera
            dem på mötet med <strong className="font-medium text-foreground">Hantera</strong>.
          </p>
          <p>
            <strong className="font-medium text-foreground">Kopiera protokolltext</strong>{" "}
            tar med alla ärenden i listan – månadens anmälningar och äldre ärenden som
            ännu inte är åtgärdade – med de beslut och svar som skrivits under {label}.
          </p>
          <p>
            Bara ärenden som satts till <em>Åtgärdat</em> en tidigare månad är borta.
            Ett ärende som inte får status Åtgärdat följer med till nästa månad.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title={`Inga felanmälningar för ${label}`} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          {items.map((r) => (
            <MeetingRow
              key={r.id}
              request={r}
              category={categories.find((c) => c.id === r.categoryId) ?? null}
              carriedOver={new Date(r.createdAt).getTime() < start.getTime()}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MeetingRow({
  request,
  category,
  carriedOver,
}: {
  request: MaintenanceRequest;
  category: MaintenanceCategory | null;
  /** Kom in en tidigare månad och är inte åtgärdat än. */
  carriedOver: boolean;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<FormState, FormData>(
    updateRequestAction,
    {},
  );

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <li className={cn(open && "bg-brand-50/40")}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">
            {request.number != null ? (
              <span className="mr-1.5 tabular-nums text-muted">
                {maintenanceNumberLabel(request.number)}
              </span>
            ) : null}
            {request.categoryName} · {request.location}
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm text-foreground/80">
            {request.description}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>Anmäld {formatDate(request.createdAt)}</span>
            {carriedOver ? <span>Från en tidigare månad</span> : null}
            {request.assignedTo ? <span>Utförs av {request.assignedTo}</span> : null}
            {request.memberId ? <span>Inloggad medlem</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone={statusTone[request.status]}>{statusLabel(request.status)}</Badge>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {open ? "Stäng" : "Hantera"}
          </button>
        </div>
      </div>

      {open ? (
        <form
          ref={formRef}
          action={action}
          className="space-y-4 border-t border-border px-4 pb-4 pt-4"
        >
          <RequestFields request={request} category={category} />
          {state.error ? <FormError>{state.error}</FormError> : null}
          {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton>Spara</SubmitButton>
            <ReplyEmailButton request={request} />
          </div>
          <Timeline events={request.events} />
        </form>
      ) : null}
    </li>
  );
}
