import Link from "next/link";
import { getBuildingsWithCounts, getUnassignedApartments } from "@/lib/data";
import type { BuildingWithCounts } from "@/lib/types";
import { Badge, Card, CardBody, PageHeader } from "@/components/ui";
import { BuildingManager } from "./building-manager";

function BuildingCard({ building }: { building: BuildingWithCounts }) {
  return (
    <Link href={`/admin/lagenheter/hus/${building.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardBody className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">
                {building.name}
              </p>
              {building.address ? (
                <p className="truncate text-sm text-muted">{building.address}</p>
              ) : null}
            </div>
            {building.forSaleCount > 0 ? (
              <Badge tone="brand">{building.forSaleCount} till salu</Badge>
            ) : null}
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {building.apartmentCount}
          </p>
          <p className="text-sm text-muted">
            {building.apartmentCount === 1 ? "lägenhet" : "lägenheter"}
          </p>
        </CardBody>
      </Card>
    </Link>
  );
}

export default async function AdminApartmentsPage() {
  const [buildings, unassigned] = await Promise.all([
    getBuildingsWithCounts(),
    getUnassignedApartments(),
  ]);

  const total =
    buildings.reduce((sum, b) => sum + b.apartmentCount, 0) + unassigned.length;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Lägenheter"
        description={`Föreningens fastighet, hus för hus. ${total} ${
          total === 1 ? "lägenhet" : "lägenheter"
        } i registret.`}
      />

      {buildings.length === 0 && unassigned.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center text-sm text-muted">
            Registret är tomt. Börja med att lägga till ett hus nedan – sedan
            kan du fylla det med lägenheter på en gång.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map((b) => (
            <BuildingCard key={b.id} building={b} />
          ))}

          {/* Lägenheter utan hus – bland annat de som skapats automatiskt när
              en boende loggat in. Kortet visas bara när det finns några. */}
          {unassigned.length > 0 ? (
            <Link href="/admin/lagenheter/hus/ej-placerade">
              <Card className="h-full border-dashed transition-shadow hover:shadow-md">
                <CardBody className="space-y-2">
                  <p className="font-semibold text-foreground">Ej placerade</p>
                  <p className="text-2xl font-bold tracking-tight text-foreground">
                    {unassigned.length}
                  </p>
                  <p className="text-sm text-muted">
                    saknar hus – placera dem här
                  </p>
                </CardBody>
              </Card>
            </Link>
          ) : null}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Hus</h2>
        <BuildingManager buildings={buildings} />
      </section>
    </div>
  );
}
