import Link from "next/link";
import { notFound } from "next/navigation";
import { getApartmentById } from "@/lib/data";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { FactsForm } from "@/components/apartment/facts-form";
import { FloorPlanManager } from "@/components/apartment/floor-plan-manager";
import {
  deleteApartmentAction,
  releaseApartmentAction,
  removeFloorPlanAction,
  updateFactsAction,
  uploadFloorPlanAction,
} from "../actions";
import { startListingAction } from "../../till-salu/actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminApartmentEditPage({ params }: Props) {
  const { id } = await params;
  const apartment = await getApartmentById(id);
  if (!apartment) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Lägenhet ${apartment.number}`}
        description={
          apartment.ownerMemberId
            ? "Hanteras även av en boende."
            : "Skapad av styrelsen."
        }
        actions={
          <form action={deleteApartmentAction}>
            <input type="hidden" name="apartmentId" value={apartment.id} />
            <button
              type="submit"
              className="text-sm font-medium text-red-600 hover:underline"
            >
              Ta bort lägenhet
            </button>
          </form>
        }
      />

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold">Lägenhetsfakta</h3>
          <FactsForm apartment={apartment} action={updateFactsAction} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <h3 className="font-semibold">Planritning</h3>
          <FloorPlanManager
            apartment={apartment}
            uploadAction={uploadFloorPlanAction}
            removeAction={removeFloorPlanAction}
          />
        </CardBody>
      </Card>

      {/* Försäljningen bor under Till salu – här finns bara vägen dit. */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          {apartment.forSale ? (
            <>
              <p className="text-sm text-muted">
                Lägenheten är till salu.
              </p>
              <Link
                href={`/admin/till-salu/${apartment.id}`}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Hantera annonsen →
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Lägenheten är inte till salu.
              </p>
              <form action={startListingAction}>
                <input type="hidden" name="apartmentId" value={apartment.id} />
                <button className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Lägg ut till salu
                </button>
              </form>
            </>
          )}
        </CardBody>
      </Card>

      {apartment.ownerMemberId ? (
        <Card className="border-red-200">
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-xl">
              <h3 className="font-semibold">Registrera ägarbyte</h3>
              <p className="mt-1 text-sm text-muted">
                Använd när lägenheten har bytt ägare. Annonsen och alla bilder
                raderas, och den boende kopplas bort från lägenheten. Fakta och
                planritning ligger kvar och följer med till nästa ägare. Går inte
                att ångra.
              </p>
            </div>
            <form action={releaseApartmentAction}>
              <input type="hidden" name="apartmentId" value={apartment.id} />
              <button className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                Registrera ägarbyte
              </button>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
