import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSupport } from "@/lib/auth";
import {
  getApartmentAccount,
  getApartmentById,
  getAssociationProfile,
} from "@/lib/data";
import type { ApartmentAccount } from "@/lib/data/access-codes";
import { formatDate } from "@/lib/utils";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { FactsForm } from "@/components/apartment/facts-form";
import { FloorPlanManager } from "@/components/apartment/floor-plan-manager";
import {
  changeOwnerAction,
  deleteApartmentAction,
  newCodeAction,
  removeFloorPlanAction,
  updateFactsAction,
  uploadFloorPlanAction,
} from "../actions";
import { CodeLettersButton } from "../code-letters";
import { startListingAction } from "../../till-salu/actions";

interface Props {
  params: Promise<{ id: string }>;
}

function accountText(account: ApartmentAccount | null): string {
  if (!account) return "Inte aktiverat ännu.";
  if (account.kind === "personal") {
    return "Ett personligt konto från tiden med registrering. Det ersätts när lägenhetens kod används.";
  }
  return `Aktiverat ${formatDate(account.activatedAt)}.`;
}

export default async function AdminApartmentEditPage({ params }: Props) {
  await requireSupport();
  const { id } = await params;
  const [apartment, account, profile] = await Promise.all([
    getApartmentById(id),
    getApartmentAccount(id),
    getAssociationProfile(),
  ]);
  if (!apartment) notFound();
  const sender = { name: profile.name, contactEmail: profile.contactEmail };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Lägenhet ${apartment.number}`}
        description={
          account ? "Lägenheten har ett konto." : "Lägenheten har inget konto ännu."
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

      <Card>
        <CardBody className="space-y-5">
          <div>
            <h3 className="font-semibold">Kod och konto</h3>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted">Kod</dt>
              <dd>
                {apartment.accessCodeCreatedAt
                  ? `Skapad ${formatDate(apartment.accessCodeCreatedAt)}.`
                  : "Ingen kod ännu."}
              </dd>
              <dt className="text-muted">Konto</dt>
              <dd>{accountText(account)}</dd>
            </dl>
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <p className="text-sm text-muted">
              Tappad kod: lägenheten får en ny, och den gamla slutar gälla. Kontot
              finns kvar tills någon använder den nya koden.
            </p>
            <CodeLettersButton
              action={newCodeAction}
              fields={{ apartmentId: apartment.id }}
              label={apartment.accessCodeCreatedAt ? "Ny kod" : "Skapa kod"}
              pendingText="Skapar kod…"
              variant="secondary"
              sender={sender}
            />
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <p className="text-sm text-muted">
              Ägarbyte: kontot raderas och säljaren loggas ut, annonsen och
              bilderna raderas och lägenheten får en ny kod – brevet till
              köparen. Fakta och planritning ligger kvar.
            </p>
            <CodeLettersButton
              action={changeOwnerAction}
              fields={{ apartmentId: apartment.id }}
              label="Registrera ägarbyte"
              pendingText="Registrerar…"
              variant="danger"
              confirmText="Lägenhetens konto raderas och alla som är inloggade loggas ut. Annonsen och bilderna raderas, och den gamla koden slutar gälla. Går inte att ångra."
              sender={sender}
            />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
