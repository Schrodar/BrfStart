import Link from "next/link";
import { requireApprovedMember } from "@/lib/auth";
import { getOrCreateOwnedApartment } from "@/lib/data";
import { canEditListing, LOCKED_WHILE_PUBLISHED } from "@/lib/listing-rules";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardBody } from "@/components/ui";
import { ListingForm } from "@/components/apartment/listing-form";
import { PhotoManager } from "@/components/apartment/photo-manager";
import { removePhotoAction, uploadPhotoAction } from "../min-lagenhet/actions";
import {
  endListingAction,
  publishAction,
  startListingAction,
  submitListingAction,
  unpublishAction,
  updateListingAction,
  withdrawListingAction,
} from "./actions";

const primary =
  "rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700";
const secondary =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-black/5";

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

  const selfPublish = user.canManageListing;

  // Ingen annons påbörjad ännu – visa bara startpunkten, inte ett tomt formulär.
  if (!apartment.forSale) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Sälja bostaden</h2>
          <p className="mt-1 text-sm text-muted">
            Skapa en annons för lägenhet {apartment.number}. Den syns inte
            publikt förrän den publiceras –{" "}
            {selfPublish
              ? "det gör du själv när du är nöjd."
              : "när du är nöjd skickar du den till styrelsen, som publicerar den."}
          </p>
        </div>
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Fakta, planritning och bilder hämtas från{" "}
              <Link
                href="/medlem/min-lagenhet"
                className="text-brand-700 hover:underline"
              >
                Min lägenhet
              </Link>
              .
            </p>
            <form action={startListingAction}>
              <button className={primary}>Skapa annons</button>
            </form>
          </CardBody>
        </Card>
      </div>
    );
  }

  const published = apartment.listingStatus === "published";
  const submitted = !published && Boolean(apartment.submittedAt);
  const editable = canEditListing(selfPublish, apartment);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          Annons – lägenhet {apartment.number}
        </h2>
        {published ? (
          <Badge tone="success">Publicerad</Badge>
        ) : submitted ? (
          <Badge tone="brand">Väntar på styrelsen</Badge>
        ) : (
          <Badge tone="warning">Utkast</Badge>
        )}
      </div>

      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {published ? (
              <Link
                href={`/till-salu/${apartment.id}`}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Visa publik annons →
              </Link>
            ) : submitted ? (
              <span className="text-sm text-muted">
                Skickad till styrelsen {formatDate(apartment.submittedAt)}. De
                publicerar annonsen när de har tittat på den.
              </span>
            ) : (
              <span className="text-sm text-muted">Syns inte publikt ännu.</span>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {published ? (
                <form action={unpublishAction}>
                  <button className={secondary}>Avpublicera</button>
                </form>
              ) : selfPublish ? (
                <form action={publishAction}>
                  <button className={primary}>Publicera annons</button>
                </form>
              ) : submitted ? (
                <form action={withdrawListingAction}>
                  <button className={secondary}>Ta tillbaka</button>
                </form>
              ) : (
                <form action={submitListingAction}>
                  <button className={primary}>Skicka till styrelsen</button>
                </form>
              )}
              <form action={endListingAction}>
                <button className="text-sm font-medium text-red-600 hover:underline">
                  Avsluta försäljning
                </button>
              </form>
            </div>
          </div>
          {editable ? null : (
            <p className="text-xs text-muted">{LOCKED_WHILE_PUBLISHED}</p>
          )}
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
          <div>
            <h3 className="font-semibold">Bilder</h3>
            <p className="text-sm text-muted">
              Samma bilder som under Min lägenhet. Första bilden blir omslagsbild.
            </p>
          </div>
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
