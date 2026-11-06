import Link from "next/link";
import { requireApprovedMember } from "@/lib/auth";
import { getMemberMaintenanceRequests } from "@/lib/data";
import {
  isActiveMaintenanceStatus,
  MAINTENANCE_STATUS_TONE,
  maintenanceStatusLabel,
} from "@/lib/maintenance-status";
import { Badge, Card, CardBody } from "@/components/ui";

const shortcuts = [
  {
    href: "/medlem/min-lagenhet",
    title: "Min lägenhet",
    description: "Uppgifter om lägenheten och planritningen.",
    apartmentOnly: true,
  },
  {
    href: "/medlem/felanmalningar",
    title: "Felanmälningar",
    description: "Följ era felanmälningar och se vad styrelsen gjort.",
    apartmentOnly: false,
  },
  {
    href: "/medlem/dokument",
    title: "Dokument",
    description: "Läs styrelseprotokoll och andra interna dokument.",
    apartmentOnly: false,
  },
  {
    href: "/medlem/salja",
    title: "Sälja bostaden",
    description: "Skapa och publicera en annons för lägenheten.",
    apartmentOnly: true,
  },
];

export default async function MemberDashboard() {
  const user = await requireApprovedMember();
  const requests = await getMemberMaintenanceRequests(user.id);
  // Det som är värt att se direkt: pågående ärenden, och åtgärdade ärenden
  // man inte sett den nya statusen på än.
  const current = requests.filter(
    (r) => isActiveMaintenanceStatus(r.status) || r.hasUpdate,
  );
  // Min lägenhet och Sälja hör till lägenhetens konto.
  const visible = shortcuts.filter((s) => user.apartmentNumber || !s.apartmentOnly);

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Här hittar du det som bara är för boende i föreningen.
      </p>

      {current.length > 0 ? (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-semibold">Pågående felanmälningar</h3>
              <Link
                href="/medlem/felanmalningar"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Visa alla →
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {current.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-foreground">
                      {r.categoryName}
                    </span>
                    <span className="text-muted"> · {r.location}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {r.hasUpdate ? <Badge tone="warning">Ny status</Badge> : null}
                    <Badge tone={MAINTENANCE_STATUS_TONE[r.status]}>
                      {maintenanceStatusLabel(r.status)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.description}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
