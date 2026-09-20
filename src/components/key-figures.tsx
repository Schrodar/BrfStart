import type { FigureOk } from "@/lib/key-figures";
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
