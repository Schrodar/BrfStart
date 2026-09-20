import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getApartmentsByBuilding,
  getBuildingById,
  getBuildings,
  getUnassignedApartments,
} from "@/lib/data";
import type { Apartment } from "@/lib/types";
import { floorLabel, formatApartmentNumber } from "@/lib/numbering";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { BulkAddForm } from "../../bulk-add-form";
import { MoveApartmentForm } from "../../move-apartment-form";

interface Props {
  params: Promise<{ id: string }>;
}

/** Samlingsvyn för lägenheter som saknar hus använder samma sida. */
const UNASSIGNED = "ej-placerade";

function ApartmentTable({
  apartments,
  buildings,
  currentBuildingId,
}: {
  apartments: Apartment[];
  buildings: { id: string; name: string }[];
  currentBuildingId: string | null;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Lägenhet</th>
            <th className="px-4 py-3 font-medium">Fakta</th>
            <th className="px-4 py-3 font-medium">Planritning</th>
            <th className="px-4 py-3 font-medium">Flytta till</th>
            <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {apartments.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">
                  {formatApartmentNumber(a.number, a.standardNumber)}
                </span>
                {a.forSale ? (
                  <Badge tone="brand" className="ml-2">
                    Till salu
                  </Badge>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted">
                {[a.floor !== "" && floorLabel(Number(a.floor)), a.rooms, a.sizeSqm && `${a.sizeSqm} m²`]
                  .filter(Boolean)
                  .join(" · ") || "–"}
              </td>
              <td className="px-4 py-3 text-muted">
                {a.floorPlanPath ? "Uppladdad" : "–"}
              </td>
              <td className="px-4 py-3">
                <MoveApartmentForm
                  apartmentId={a.id}
                  currentBuildingId={currentBuildingId}
                  buildings={buildings}
                />
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/lagenheter/${a.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Redigera
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function BuildingPage({ params }: Props) {
  const { id } = await params;
  const unassignedView = id === UNASSIGNED;

  const [building, buildings] = await Promise.all([
    unassignedView ? Promise.resolve(null) : getBuildingById(id),
    getBuildings(),
  ]);
  if (!unassignedView && !building) notFound();

  const apartments = unassignedView
    ? await getUnassignedApartments()
    : await getApartmentsByBuilding(id);

  return (
    <div className="space-y-8">
      <PageHeader
        title={unassignedView ? "Ej placerade" : building!.name}
        description={
          unassignedView
            ? "Lägenheter som inte hör till något hus ännu. Placera dem för att få med dem i översikten."
            : building!.address || undefined
        }
        actions={
          <Link
            href="/admin/lagenheter"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            ← Alla hus
          </Link>
        }
      />

      {apartments.length === 0 ? (
        <EmptyState
          title={
            unassignedView
              ? "Alla lägenheter är placerade"
              : "Inga lägenheter i huset ännu"
          }
        />
      ) : (
        <ApartmentTable
          apartments={apartments}
          buildings={buildings}
          currentBuildingId={unassignedView ? null : id}
        />
      )}

      {!unassignedView ? (
        <Card>
          <CardBody className="space-y-4">
            <div>
              <h3 className="font-semibold">Lägg till flera lägenheter</h3>
              <p className="text-sm text-muted">
                Numren löper från husets startnummer ({building!.numberStart})
                och fortsätter mellan våningarna. Nummer som redan finns hoppas
                över, och varje nummer går att ändra i efterhand.
              </p>
            </div>
            <BulkAddForm
              buildingId={id}
              numberStart={building!.numberStart}
              numberTopDown={building!.numberTopDown}
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
