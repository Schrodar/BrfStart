import type { Metadata } from "next";
import Link from "next/link";
import { requireApprovedMember } from "@/lib/auth";
import { getMemberMaintenanceRequests } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { buttonClasses, EmptyState } from "@/components/ui";
import { MemberRequestList, type MemberRequestView } from "./request-list";

export const metadata: Metadata = {
  title: "Mina felanmälningar",
};

export default async function MemberMaintenancePage() {
  const user = await requireApprovedMember();
  const requests = await getMemberMaintenanceRequests(user.id);

  const views: MemberRequestView[] = requests.map((r) => ({
    ...r,
    createdLabel: formatDate(r.createdAt),
    stepDates: Object.fromEntries(
      Object.entries(r.statusDates).map(([status, iso]) => [status, formatDate(iso)]),
    ),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Mina felanmälningar</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Ärenden du anmält medan du var inloggad. Här ser du hur långt
            styrelsen har kommit, och du får besked när statusen ändras.
          </p>
        </div>
        <Link href="/felanmalan" className={buttonClasses("secondary", "sm")}>
          Gör en felanmälan
        </Link>
      </div>

      {views.length === 0 ? (
        <EmptyState
          title="Du har inga felanmälningar"
          description="Har något gått sönder i huset eller de gemensamma utrymmena? Gör en felanmälan medan du är inloggad, så kan du följa den här."
        />
      ) : (
        <MemberRequestList requests={views} />
      )}
    </div>
  );
}
