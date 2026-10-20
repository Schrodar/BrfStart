"use client";

import { useEffect, useState } from "react";
import type { MaintenanceStatus, MemberMaintenanceRequest } from "@/lib/types";
import { isActiveMaintenanceStatus } from "@/lib/maintenance-status";
import { Badge, Card, CardBody } from "@/components/ui";
import { StatusSteps } from "@/components/maintenance/status-steps";
import { cn } from "@/lib/utils";
import { markMaintenanceSeenAction } from "./actions";

export interface MemberRequestView extends MemberMaintenanceRequest {
  /** Datumen formateras på servern – annars kan tidszonen ge ett annat datum vid hydrering. */
  createdLabel: string;
  stepDates: Partial<Record<MaintenanceStatus, string>>;
  /** Styrelsens svar och synliga beslut, med färdigformaterat datum. */
  messageViews: { id: string; kind: "reply" | "decision"; body: string; dateLabel: string }[];
}

export function MemberRequestList({
  requests,
}: {
  requests: MemberRequestView[];
}) {
  // Vilka ärenden som hade ny status när sidan öppnades. Sparas i state: när
  // besöket markerats som sett laddas sidan om utan nyheter, men
  // markeringarna ska ligga kvar så länge man är kvar på sidan.
  const [updatedIds] = useState(
    () => new Set(requests.filter((r) => r.hasUpdate).map((r) => r.id)),
  );

  useEffect(() => {
    if (updatedIds.size > 0) void markMaintenanceSeenAction();
  }, [updatedIds]);

  const active = requests.filter((r) => isActiveMaintenanceStatus(r.status));
  const done = requests.filter((r) => !isActiveMaintenanceStatus(r.status));

  return (
    <div className="space-y-8">
      <section aria-labelledby="felanmalningar-aktiva">
        <h3 id="felanmalningar-aktiva" className="font-semibold">
          Aktiva <span className="font-normal text-muted">({active.length})</span>
        </h3>
        {active.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Du har inga aktiva felanmälningar just nu.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {active.map((r) => (
              <RequestCard key={r.id} request={r} updated={updatedIds.has(r.id)} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 ? (
        <section aria-labelledby="felanmalningar-atgardade">
          <h3 id="felanmalningar-atgardade" className="font-semibold">
            Åtgärdade <span className="font-normal text-muted">({done.length})</span>
          </h3>
          <ul className="mt-3 space-y-3">
            {done.map((r) => (
              <RequestCard key={r.id} request={r} updated={updatedIds.has(r.id)} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RequestCard({
  request,
  updated,
}: {
  request: MemberRequestView;
  updated: boolean;
}) {
  return (
    <li>
      <Card className={cn(updated && "border-amber-300 ring-1 ring-amber-200")}>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {request.number != null ? (
                  <span className="mr-1.5 font-normal tabular-nums text-muted">
                    #{request.number}
                  </span>
                ) : null}
                {request.categoryName}
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {request.location} · Anmäld {request.createdLabel}
              </p>
            </div>
            {updated ? <Badge tone="warning">Ny</Badge> : null}
          </div>
          <p className="line-clamp-3 whitespace-pre-line text-sm text-foreground">
            {request.description}
          </p>
          <StatusSteps status={request.status} dates={request.stepDates} />
          {request.messageViews.length > 0 ? (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold">Från styrelsen</h4>
              <ol className="mt-2 space-y-3">
                {[...request.messageViews].reverse().map((m) => (
                  <li key={m.id} className="border-l-2 border-brand-200 pl-3">
                    <p className="text-xs text-muted">
                      {m.dateLabel} · {m.kind === "decision" ? "Beslut" : "Svar"}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">
                      {m.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </li>
  );
}
