import { Container } from "@/components/ui";
import {
  SubNav,
  type SubNavBadge,
  type SubNavItem,
} from "@/components/layout/sub-nav";
import { requireUser } from "@/lib/auth";
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
  const user = await requireUser();
  const approved = user.status === "approved";
  const maintenance = approved
    ? await getMemberMaintenanceSummary(user.id)
    : null;

  const memberNav: SubNavItem[] = [
    { href: "/medlem", label: "Översikt" },
    { href: "/medlem/min-lagenhet", label: "Min lägenhet" },
    {
      href: "/medlem/felanmalningar",
      label: "Felanmälningar",
      badge: maintenance ? maintenanceBadge(maintenance) : undefined,
    },
    { href: "/medlem/dokument", label: "Dokument" },
    { href: "/medlem/salja", label: "Sälja bostaden" },
  ];

  return (
    <div className="border-b border-border bg-surface">
      <Container className="pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
          Medlemssidor
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight">
          Hej {user.fullName.split(" ")[0]}!
        </h1>
        {approved ? (
          <div className="mt-4 border-b border-border">
            <SubNav items={memberNav} label="Medlemssidor" />
          </div>
        ) : null}
      </Container>

      <div className="bg-background">
        <Container className="py-8">{children}</Container>
      </div>
    </div>
  );
}
