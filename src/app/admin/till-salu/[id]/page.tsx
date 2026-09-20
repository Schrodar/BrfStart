import Link from "next/link";
import { notFound } from "next/navigation";
import { getApartmentById } from "@/lib/data";
import { Badge, Card, CardBody, PageHeader } from "@/components/ui";
import { ListingForm } from "@/components/apartment/listing-form";
import { PhotoManager } from "@/components/apartment/photo-manager";
import {
  endListingAction,
  publishAction,
  removePhotoAction,
  unpublishAction,
  updateListingAction,
  uploadPhotoAction,
} from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminListingEditPage({ params }: Props) {
  const { id } = await params;
  const apartment = await getApartmentById(id);
  if (!apartment || !apartment.forSale) notFound();

  const published = apartment.listingStatus === "published";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Annons – lägenhet ${apartment.number}`}
        description={
          [apartment.rooms, apartment.sizeSqm && `${apartment.sizeSqm} m²`]
            .filter(Boolean)
            .join(" · ") || undefined
        }
        actions={
          <Link
            href={`/admin/lagenheter/${apartment.id}`}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Lägenhetsuppgifter →
          </Link>
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {published ? (
              <Badge tone="success">Publicerad</Badge>
            ) : (
              <Badge tone="warning">Utkast</Badge>
            )}
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
          </div>
          <div className="flex items-center gap-3">
            {published ? (
              <form action={unpublishAction}>
                <input type="hidden" name="apartmentId" value={apartment.id} />
                <button className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-black/5">
                  Avpublicera
                </button>
              </form>
            ) : (
              <form action={publishAction}>
                <input type="hidden" name="apartmentId" value={apartment.id} />
                <button className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
                  Publicera annons
                </button>
              </form>
            )}
            {/* Avslutar försäljningen – lägenheten blir kvar i registret. */}
            <form action={endListingAction}>
              <input type="hidden" name="apartmentId" value={apartment.id} />
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
