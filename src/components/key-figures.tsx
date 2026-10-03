import Link from "next/link";
import { isStale, type FigureOk } from "@/lib/key-figures";
import type { EconomyFigures } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui";

/**
 * Nyckeltalen på /ekonomi. Bara de tal som gick att räkna ut visas – är
 * inget ifyllt syns ingen ruta alls, hellre än en ruta full av streck.
 */
export function KeyFiguresCard({
  figures,
  fiscalYear,
}: {
  figures: FigureOk[];
  fiscalYear: string;
}) {
  if (figures.length === 0) return null;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-semibold">Nyckeltal</h2>
          {fiscalYear ? (
            <p className="text-sm text-muted">Räkenskapsåret {fiscalYear}</p>
          ) : null}
        </div>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {figures.map(({ figure, number, unit }) => (
            <div key={figure.id} className="rounded-lg bg-background px-4 py-3">
              <dt className="text-sm font-medium text-muted">{figure.title}</dt>
              <dd className="mt-1">
                <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
                  {number}
                </span>{" "}
                <span className="text-sm text-muted">{unit}</span>
              </dd>
              <dd className="mt-1.5 text-xs leading-relaxed text-muted">
                {figure.description}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-xs text-muted">
          Uträknade enligt årsredovisningslagens definitioner, på samma sätt som
          i årsredovisningen.
        </p>
      </CardBody>
    </Card>
  );
}

/**
 * Kort version för sidokolumnen på /om-foreningen: bara talen, utan
 * förklaringar, och en länk till /ekonomi där de står i sin helhet.
 */
export function KeyFiguresSummary({
  figures,
  fiscalYear,
}: {
  figures: FigureOk[];
  fiscalYear: string;
}) {
  if (figures.length === 0) return null;

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Nyckeltal{fiscalYear ? ` ${fiscalYear}` : ""}
      </h2>
      <dl className="mt-4 space-y-3">
        {figures.map(({ figure, number, unit }) => (
          <div key={figure.id}>
            <dt className="text-xs text-muted">{figure.title}</dt>
            <dd className="text-sm font-medium text-foreground tabular-nums">
              {number} {unit}
            </dd>
          </div>
        ))}
      </dl>
      <Link
        href="/ekonomi"
        className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline"
      >
        Mer om föreningens ekonomi →
      </Link>
    </div>
  );
}

/**
 * Påminnelse i adminpanelen när ekonomiformuläret inte har sparats på ett år.
 * Visas bara om det finns ett räkenskapsår – en förening som aldrig fyllt i
 * nyckeltalen har inget att uppdatera.
 */
export function StaleFiguresNotice({
  figures,
  showLink = false,
}: {
  figures: EconomyFigures;
  showLink?: boolean;
}) {
  if (!figures.fiscalYear || !isStale(figures.updatedAt)) return null;

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardBody className="py-3">
        <p className="text-sm text-amber-900">
          <strong>Nyckeltalen har inte uppdaterats på över ett år.</strong> De
          sparades senast {formatDate(figures.updatedAt)} och gäller räkenskapsåret{" "}
          {figures.fiscalYear}. Har en ny årsredovisning kommit? Fyll i de nya
          siffrorna så att sidan Föreningens ekonomi stämmer.
        </p>
        {showLink ? (
          <Link
            href="/admin/foreningsinfo/ekonomi"
            className="mt-2 inline-block text-sm font-medium text-amber-900 underline hover:no-underline"
          >
            Uppdatera nyckeltalen →
          </Link>
        ) : null}
      </CardBody>
    </Card>
  );
}
