import { Container } from "@/components/ui";
import {
  SubNav,
  type SubNavBadge,
  type SubNavItem,
} from "@/components/layout/sub-nav";
import { requireApprovedMember } from "@/lib/auth";
import { getMemberMaintenanceSummary } from "@/lib/data";
import type { MemberMaintenanceSummary } from "@/lib/types";

/**
 * Märket på fliken Felanmälningar: syns så länge medlemmen har aktiva ärenden
 * och försvinner när det sista markerats som åtgärdat. Pulserar när styrelsen
 * ändrat status sedan medlemmen senast tittade.
 */
function maintenanceBadge({
  active,
  activeUpdates,
}: MemberMaintenanceSummary): SubNavBadge | undefined {
  if (active === 0) return undefined;
  const noun = active === 1 ? "aktiv felanmälan" : "aktiva felanmälningar";
  return {
    text: String(active),
    label: `${active} ${noun}${activeUpdates > 0 ? " med ny status" : ""}`,
    attention: activeUpdates > 0,
  };
}

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireApprovedMember();
  const maintenance = await getMemberMaintenanceSummary(user.id);
  // Lägenhetens konto har en lägenhet. Styrelsens personliga konton har det
  // inte – de ser Översikt, Felanmälningar och Dokument.
  const apartment = user.apartmentNumber;

  const memberNav: SubNavItem[] = [
    { href: "/medlem", label: "Översikt" },
    ...(apartment ? [{ href: "/medlem/min-lagenhet", label: "Min lägenhet" }] : []),
    {
      href: "/medlem/felanmalningar",
      label: "Felanmälningar",
      badge: maintenanceBadge(maintenance),
    },
    { href: "/medlem/dokument", label: "Dokument" },
    ...(apartment ? [{ href: "/medlem/salja", label: "Sälja bostaden" }] : []),
  ];

  return (
    <div className="border-b border-border bg-surface">
      <Container className="pt-10 sm:pt-12">
        <p className="eyebrow">Mina sidor</p>
        <h1 className="title-section mt-3">
          {apartment ? `Lägenhet ${apartment}` : `Hej ${user.fullName.split(" ")[0]}!`}
        </h1>
        <div className="mt-6 border-b border-border">
          <SubNav items={memberNav} label="Mina sidor" />
        </div>
      </Container>

      <div className="bg-background">
        <Container className="py-10 sm:py-12">{children}</Container>
      </div>
    </div>
  );
}
