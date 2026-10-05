import Link from "next/link";
import { requireApprovedMember } from "@/lib/auth";
import { getOrCreateOwnedApartment } from "@/lib/data";
import { Badge, Card, CardBody } from "@/components/ui";
import { FactsForm } from "@/components/apartment/facts-form";
import { FloorPlanManager } from "@/components/apartment/floor-plan-manager";
import { PhotoManager } from "@/components/apartment/photo-manager";
import {
  removeFloorPlanAction,
  removePhotoAction,
  updateFactsAction,
  uploadFloorPlanAction,
  uploadPhotoAction,
} from "./actions";

export default async function MyApartmentPage() {
  const user = await requireApprovedMember();
  const apartment = await getOrCreateOwnedApartment({
    id: user.id,
    apartment: user.apartment,
  });

  if (!apartment) {
    return (
      <Card>
        <CardBody className="py-8 text-center text-sm text-muted">
          Vi kunde inte koppla dig till en lägenhet
          {user.apartment ? ` (nummer ${user.apartment})` : " (lägenhetsnummer saknas)"}.
          Kontakta styrelsen så hjälper de dig.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Lägenhet {apartment.number}</h2>
        {apartment.forSale ? <Badge tone="brand">Till salu</Badge> : null}
      </div>

      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-semibold">Lägenhetsfakta</h3>
          <FactsForm apartment={apartment} action={updateFactsAction} />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div>
            <h3 className="font-semibold">Planritning</h3>
            <p className="text-sm text-muted">
              Privat – bara du och styrelsen ser den, om du inte väljer att visa
              den i en annons.
            </p>
          </div>
          <FloorPlanManager
            apartment={apartment}
            uploadAction={uploadFloorPlanAction}
            removeAction={removeFloorPlanAction}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <div>
            <h3 className="font-semibold">Bilder</h3>
            <p className="text-sm text-muted">
              Ladda upp bilder inför en försäljning. De visas publikt först när
              en annons publiceras – första bilden blir omslagsbild.
            </p>
          </div>
          <PhotoManager
            apartment={apartment}
            uploadAction={uploadPhotoAction}
            removeAction={removePhotoAction}
          />
        </CardBody>
      </Card>

      {/* Försäljningen har en egen sida – här står bara vägen dit. */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {apartment.forSale
              ? "Din lägenhet har en annons."
              : "Vill du sälja? Skapa en annons med bilderna och planritningen härifrån."}
          </p>
          <Link
            href="/medlem/salja"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            {apartment.forSale ? "Hantera annonsen →" : "Sälja bostaden →"}
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}
