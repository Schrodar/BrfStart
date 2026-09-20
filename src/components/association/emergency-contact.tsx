import { PhoneLink } from "./links";

/**
 * Jourkontakt vid akuta fel. Renderar inget om jourtelefon saknas.
 *
 * Uppgifterna kommer från felanmälningsinställningarna i databasen, inte från
 * siteConfig – styrelsen ska kunna ändra och dölja dem utan en ny deploy.
 */
export function EmergencyContact({
  phone,
  description = "",
  className,
  label = "Jour (akut):",
}: {
  phone: string;
  description?: string;
  className?: string;
  label?: string;
}) {
  if (!phone) return null;
  return (
    <div className={className}>
      <p className="text-sm">
        {label ? <span className="text-muted">{label} </span> : null}
        <PhoneLink phone={phone} className="font-medium text-foreground" />
      </p>
      {description ? (
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      ) : null}
    </div>
  );
}
