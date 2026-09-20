/**
 * Hopfällbar sektion på adminsidan.
 *
 * Byggd på <details>/<summary> med flit: infällningen fungerar utan
 * JavaScript, tangentbord och skärmläsare hanterar den redan, och sektionen
 * behöver därför inte vara en klientkomponent.
 */
export function AdminSection({
  title,
  description,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  /** Kort räknare i rubriken, t.ex. antal öppna ärenden. */
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-card border border-border bg-surface"
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-4 hover:bg-brand-50/40 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-semibold">
            {title}
            {badge ? (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                {badge}
              </span>
            ) : null}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
        <span
          aria-hidden="true"
          /* Ingen transition med flit: rotate går från none till 180deg, och
             den övergången går inte att interpolera – Chrome fastnar då på
             0deg och pilen pekar åt fel håll. Utan animation blir den rätt. */
          className="shrink-0 pt-1 text-muted group-open:rotate-180"
        >
          ▾
        </span>
      </summary>

      <div className="border-t border-border p-5">{children}</div>
    </details>
  );
}
