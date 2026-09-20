import type { AssociationProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Föreningens postadress i ett semantiskt <address>-element. Tomma fält
 * hoppas över, och saknas hela adressen renderas ingenting.
 */
export function AddressDetails({
  address,
  className,
}: {
  address: Pick<AssociationProfile, "street" | "postalCode" | "city">;
  className?: string;
}) {
  const { street, postalCode, city } = address;
  const postalLine = [postalCode, city].filter(Boolean).join(" ");
  if (!street && !postalLine) return null;
  return (
    <address className={cn("not-italic", className)}>
      {street ? <span>{street}</span> : null}
      {street && postalLine ? <br /> : null}
      {postalLine ? <span>{postalLine}</span> : null}
    </address>
  );
}
