import Link from "next/link";
import { getApartmentsNotForSale } from "@/lib/data";
import { buttonClasses, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { startListingAction } from "../actions";

/**
 * En annons skapas alltid för en lägenhet som redan finns i registret – därför
 * väljer man här i stället för att mata in lägenhetsuppgifter på nytt.
 */
export default async function NewListingPage() {
  const apartments = await getApartmentsNotForSale();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Ny annons"
        description="Välj vilken lägenhet som ska läggas ut till salu."
      />

      {apartments.length === 0 ? (
        <div className="space-y-4">
          <EmptyState title="Alla lägenheter är redan till salu" />
          <Link href="/admin/lagenheter" className={buttonClasses("primary", "sm")}>
            Till lägenhetsregistret
          </Link>
        </div>
      ) : (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {apartments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      Lägenhet {a.number}
                    </p>
                    <p className="text-xs text-muted">
                      {[a.rooms, a.sizeSqm && `${a.sizeSqm} m²`]
                        .filter(Boolean)
                        .join(" · ") || "Inga uppgifter ifyllda"}
                    </p>
                  </div>
                  <form action={startListingAction}>
                    <input type="hidden" name="apartmentId" value={a.id} />
                    <button className={buttonClasses("primary", "sm")}>
                      Lägg ut till salu
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
