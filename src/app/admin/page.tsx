import Link from "next/link";
import {
  getAllNews,
  getMaintenanceRequests,
  getPendingMembers,
} from "@/lib/data";
import { Card, CardBody } from "@/components/ui";

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardBody>
          <p className="text-sm text-muted">{label}</p>
          <p
            className={
              highlight && value > 0
                ? "mt-1 text-3xl font-bold text-brand-700"
                : "mt-1 text-3xl font-bold text-foreground"
            }
          >
            {value}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}

export default async function AdminDashboard() {
  const [pending, maintenance, news] = await Promise.all([
    getPendingMembers(),
    getMaintenanceRequests(),
    getAllNews(),
  ]);

  const newRequests = maintenance.filter((r) => r.status !== "atgardad").length;
  const drafts = news.filter((n) => !n.published).length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Väntar på godkännande"
          value={pending.length}
          href="/admin/medlemmar"
          highlight
        />
        <StatCard
          label="Öppna felanmälningar"
          value={newRequests}
          href="/admin/felanmalningar"
          highlight
        />
        <StatCard
          label="Utkast (nyheter)"
          value={drafts}
          href="/admin/nyheter"
        />
      </div>

      <Card>
        <CardBody>
          <h2 className="font-semibold">Kom igång</h2>
          <p className="mt-1 text-sm text-muted">
            Härifrån hanterar styrelsen allt innehåll på sidan. Använd flikarna
            ovan för att redigera nyheter, dokument, styrelseuppgifter,
            föreningsfakta och för att hantera medlemmar, felanmälningar och
            lägenheter.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
