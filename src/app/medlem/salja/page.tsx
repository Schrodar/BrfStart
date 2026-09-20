import Link from "next/link";
import { requireApprovedMember } from "@/lib/auth";
import { getOrCreateOwnedApartment } from "@/lib/data";
import { Badge, Card, CardBody } from "@/components/ui";
import { ListingForm } from "@/components/apartment/listing-form";
import { PhotoManager } from "@/components/apartment/photo-manager";
import {
  endListingAction,
  publishAction,
  removePhotoAction,
  startListingAction,
  unpublishAction,
  updateListingAction,
  uploadPhotoAction,
} from "./actions";

export default async function SellApartmentPage() {
  const user = await requireApprovedMember();
  const apartment = await getOrCreateOwnedApartment({
    id: user.id,
    apartment: user.apartment,
  });

  if (!apartment) {
    return (
      <Card>
        <CardBody className="py-8 text-center text-sm text-muted">
          Vi kunde inte koppla dig till en lägenhet. Kontakta styrelsen så
          hjälper de dig.
        </CardBody>
      </Card>
    );
  }

  if (!user.canManageListing) {
    return (
      <Card>
        <CardBody className="text-sm text-muted">
          Vill du lägga upp din lägenhet till salu på sidan? Be styrelsen om
          behörighet, så kan du skapa och publicera en annons här.
        </CardBody>
      </Card>
    );
  }

  // Ingen annons påbörjad ännu – visa bara startpunkten, inte ett tomt formulär.
  if (!apartment.forSale) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sälja bostaden</h2>
          <p className="mt-1 text-sm text-muted">
            Skapa en annons för lägenhet {apartment.number}. Den syns inte
            publikt förrän du väljer att publicera den.
          </p>
        </div>
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Uppgifter om rum och storlek hämtas från{" "}
              <Link
                href="/medlem/min-lagenhet"
                className="text-brand-700 hover:underline"
              >
                Min lägenhet
              </Link>
              .
            </p>
            <form action={startListingAction}>
              <button className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                Skapa annons
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  const published = apartment.listingStatus === "published";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          Annons – lägenhet {apartment.number}
        </h2>
        {published ? (
          <Badge tone="success">Publicerad</Badge>
        ) : (
          <Badge tone="warning">Utkast</Badge>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          {published ? (
            <Link
              href={`/till-salu/${apartment.id}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Visa publik annons →
            </Link>
          ) : (
            <span className="text-sm text-muted">Syns inte publikt ännu.</span>
          )}
          <div className="flex items-center gap-3">
            {published ? (
              <form action={unpublishAction}>
                <button className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Avpublicera
                </button>
              </form>
            ) : (
              <form action={publishAction}>
                <button className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                  Publicera annons
                </button>
              </form>
            )}
            <form action={endListingAction}>
              <button className="text-sm font-medium text-red-600 hover:underline">
                Avsluta försäljning
              </button>
            </form>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold">Annonsuppgifter</h3>
          <ListingForm apartment={apartment} action={updateListingAction} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold">Foton</h3>
          <PhotoManager
            apartment={apartment}
            uploadAction={uploadPhotoAction}
            removeAction={removePhotoAction}
          />
        </CardBody>
      </Card>
    </div>
  );
}
