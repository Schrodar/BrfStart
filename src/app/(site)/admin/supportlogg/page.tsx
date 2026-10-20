import { getSupportLog, type SupportLogStatus } from "@/lib/data";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import type { BadgeTone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

const STATUS: Record<SupportLogStatus, { label: string; tone: BadgeTone }> = {
  pagar: { label: "Pågår", tone: "warning" },
  avslutad: { label: "Avslutad", tone: "neutral" },
  utgangen: { label: "Tiden gick ut", tone: "neutral" },
  oanvand: { label: "Länken öppnades inte", tone: "neutral" },
};

/**
 * Styrelsens insyn i supportläget: varje gång plattformens support haft
 * tillgång till adminpanelen, varför, och allt som ändrades under tiden.
 * Raderna skrivs automatiskt (src/lib/support-log.ts) och går inte att ändra.
 */
export default async function SupportLogPage() {
  const sessions = await getSupportLog();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supportlogg"
        description="När plattformens support har haft tillgång till adminpanelen, varför och vad som ändrades."
      />

      {sessions.length === 0 ? (
        <EmptyState title="Supporten har inte haft åtkomst till föreningen." />
      ) : (
        <ul className="space-y-4">
          {sessions.map((s) => {
            const status = STATUS[s.status];
            return (
              <li key={s.id}>
                <Card>
                  <CardBody className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{s.adminName}</p>
                        <p className="mt-0.5 text-sm text-muted">
                          {s.usedAt
                            ? `${formatDateTime(s.usedAt)} – ${formatDateTime(s.endsAt)}`
                            : `Länk skapad ${formatDateTime(s.startedAt)}`}
                        </p>
                      </div>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </div>

                    {s.reason ? (
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        <span className="font-medium">Skäl: </span>
                        {s.reason}
                      </p>
                    ) : null}

                    {s.usedAt ? (
                      s.changes.length === 0 ? (
                        <p className="border-t border-border pt-3 text-sm text-muted">
                          Inga ändringar gjordes.
                        </p>
                      ) : (
                        <ol className="space-y-1.5 border-t border-border pt-3 text-sm">
                          {s.changes.map((c) => (
                            <li key={c.id} className="flex gap-3">
                              <span className="w-32 shrink-0 tabular-nums text-muted">
                                {formatDateTime(c.at)}
                              </span>
                              <span className="text-foreground">{c.summary}</span>
                            </li>
                          ))}
                        </ol>
                      )
                    ) : null}
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
