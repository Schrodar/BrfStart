import type { MaintenanceStatus } from "@/lib/types";
import { MAINTENANCE_STATUSES } from "@/lib/maintenance-status";
import { cn } from "@/lib/utils";

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Var ärendet befinner sig: Inskickat → Behandlat av styrelsen → Åtgärdat.
 *
 * Steg före den nuvarande statusen räknas som klara även om styrelsen hoppat
 * över något av dem. Datum visas bara för steg som faktiskt nåtts – har ett
 * åtgärdat ärende öppnats igen ska det gamla åtgärdsdatumet inte stå kvar.
 */
export function StatusSteps({
  status,
  dates,
}: {
  status: MaintenanceStatus;
  /** Färdigformaterade datum per status. */
  dates: Partial<Record<MaintenanceStatus, string>>;
}) {
  const current = MAINTENANCE_STATUSES.findIndex((s) => s.value === status);
  const finished = status === "atgardad";

  return (
    <ol aria-label="Ärendets förlopp" className="grid grid-cols-3">
      {MAINTENANCE_STATUSES.map((step, index) => {
        const done = index < current || finished;
        const isCurrent = index === current && !finished;
        const reached = index <= current;
        return (
          <li
            key={step.value}
            aria-current={index === current ? "step" : undefined}
            className="relative flex flex-col items-center px-1 text-center"
          >
            {/* Linjen från föregående steg, från mitt till mitt. */}
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2",
                  reached
                    ? finished
                      ? "bg-emerald-500"
                      : "bg-brand-500"
                    : "bg-border",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 flex size-6 items-center justify-center rounded-full border-2",
                finished
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : done
                    ? "border-brand-600 bg-brand-600 text-white"
                    : isCurrent
                      ? "border-brand-600 bg-surface"
                      : "border-border bg-surface",
              )}
            >
              {done ? (
                <CheckIcon />
              ) : isCurrent ? (
                <span className="size-2 rounded-full bg-brand-600 motion-safe:animate-pulse" />
              ) : null}
            </span>
            <span
              className={cn(
                "mt-2 text-xs font-medium leading-tight",
                reached ? "text-foreground" : "text-muted",
              )}
            >
              {step.label}
            </span>
            {reached && dates[step.value] ? (
              <span className="mt-0.5 text-xs text-muted">
                {dates[step.value]}
              </span>
            ) : null}
            <span className="sr-only">
              {done ? " – klart" : isCurrent ? " – nuvarande steg" : " – inte ännu"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
