"use client";

import type { MaintenanceCategory, MaintenanceRequest } from "@/lib/types";
import {
  MAINTENANCE_STATUSES,
  maintenanceNumberLabel,
} from "@/lib/maintenance-status";
import { CopyButton } from "@/components/maintenance/copy-button";
import { Field, Input, Select, Textarea } from "@/components/ui";

/**
 * Ett färdigt mejl till anmälaren. Sajten skickar inga mejl själv, så
 * styrelsen kopierar det här och skickar från sin egen e-post.
 */
function replyEmail(request: MaintenanceRequest, body: string): string {
  const subject = [
    "Din felanmälan",
    maintenanceNumberLabel(request.number),
    `– ${request.categoryName}, ${request.location}`,
  ]
    .filter(Boolean)
    .join(" ");
  const greeting = request.name ? `Hej ${request.name}!` : "Hej!";
  return [
    `Till: ${request.email}`,
    `Ämne: ${subject}`,
    "",
    greeting,
    "",
    body || "[Skriv ert svar här]",
    "",
    "Med vänliga hälsningar",
    "Styrelsen",
  ].join("\n");
}

/**
 * Fälten för att hantera ett ärende. Samma fält i ärendemodalen och i
 * mötesläget, så att ett ärende sparas likadant var styrelsen än sitter.
 * Formuläret runt omkring skickar till updateRequestAction.
 */
export function RequestFields({
  request,
  category,
}: {
  request: MaintenanceRequest;
  category: MaintenanceCategory | null;
}) {
  const id = (name: string) => `${name}-${request.id}`;
  const isMember = Boolean(request.memberId);

  return (
    <>
      <input type="hidden" name="id" value={request.id} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Status"
          htmlFor={id("status")}
          hint={isMember ? "Medlemmen ser statusen på Mina sidor." : undefined}
        >
          <Select id={id("status")} name="status" defaultValue={request.status}>
            {MAINTENANCE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Vem utför jobbet?"
          htmlFor={id("assignedTo")}
          hint={
            category?.contractorName
              ? `Förslag: ${category.contractorName}`
              : "Namn på person eller firma."
          }
        >
          <Input
            id={id("assignedTo")}
            name="assignedTo"
            defaultValue={request.assignedTo}
            placeholder={category?.contractorName || undefined}
          />
        </Field>
      </div>

      {/* Ingen påminnelse skickas – därför en rekommendation i stället för ett datum. */}
      <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
        Tips: följ upp ärendena dagen före styrelsemötet – då går mötet fortare
        och sekreteraren får ett lättare jobb.
      </p>

      <Field
        label="Beslut"
        htmlFor={id("decision")}
        hint="Syns bara för styrelsen och kommer med i protokolltexten."
      >
        <Textarea
          id={id("decision")}
          name="decision"
          rows={2}
          placeholder="Kone kontaktas och lämnar offert till nästa möte."
        />
      </Field>

      <Field
        label="Svar till medlemmen"
        htmlFor={id("reply")}
        hint={
          isMember
            ? "Syns för medlemmen på Mina sidor. Skicka det också som mejl med knappen längst ner."
            : "Anmälaren var inte inloggad – skicka svaret som mejl med knappen längst ner."
        }
      >
        <Textarea
          id={id("reply")}
          name="reply"
          rows={2}
          placeholder="Tack för anmälan! Hissfirman kommer på torsdag."
        />
      </Field>

      <Field
        label="Intern notering"
        htmlFor={id("note")}
        hint="Syns bara för styrelsen."
      >
        <Textarea
          id={id("note")}
          name="note"
          rows={2}
          placeholder="Fastighetsansvarig ringde Kone 8/9, de återkommer via e-post."
        />
      </Field>
    </>
  );
}

/**
 * "Kopiera mejl till …" – ligger i foten bredvid protokollknappen. Läser
 * svarsfältet i samma ärende vid klicket; är det tomt (t.ex. nyss sparat)
 * används det senast sparade svaret.
 */
export function ReplyEmailButton({ request }: { request: MaintenanceRequest }) {
  if (!request.email) return null;
  const replyText = () => {
    const field = document.getElementById(
      `reply-${request.id}`,
    ) as HTMLTextAreaElement | null;
    return (
      field?.value.trim() ||
      request.events.findLast((e) => e.kind === "reply" && e.body)?.body ||
      ""
    );
  };
  return (
    <CopyButton
      label={`Kopiera mejl till ${request.email}`}
      getText={() => replyEmail(request, replyText())}
    />
  );
}
