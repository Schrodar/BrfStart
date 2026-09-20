import { getAssociationInfo } from "@/lib/data";
import type { AssociationInfo } from "@/lib/types";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { InfoForm } from "./info-form";

/**
 * Räknar ofyllda uppgifter. Tom sträng, tom lista och 0 betyder "inte ifyllt"
 * – siffrorna här är byggår och antal lägenheter, där noll aldrig är ett
 * riktigt värde.
 */
function countMissing(info: AssociationInfo): number {
  return Object.values(info).filter((v) => {
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "number") return v === 0;
    return String(v).trim() === "";
  }).length;
}

export default async function AdminAssociationInfoPage() {
  const info = await getAssociationInfo();
  const total = Object.keys(info).length;
  const missing = countMissing(info);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Föreningsinfo"
        description="Fakta som visas på sidorna Om föreningen, Fastigheten, För mäklare och Ekonomi."
      />

      {/* Tomma fält döljs publikt. Utan den här raden är det svårt att veta
          att de saknas – man upptäcker det när en mäklare hör av sig. */}
      {missing > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardBody className="py-3">
            <p className="text-sm text-amber-900">
              <strong>
                {missing} av {total} uppgifter är inte ifyllda.
              </strong>{" "}
              De visas inte publikt förrän du fyller i dem – sidorna hoppar över
              tomma fält i stället för att gissa.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <InfoForm info={info} />
        </CardBody>
      </Card>
    </div>
  );
}
