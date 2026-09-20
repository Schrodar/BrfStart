import type { Metadata } from "next";
import Link from "next/link";
import { getAssociationInfo, getEconomyFigures } from "@/lib/data";
import { publishedFigures } from "@/lib/key-figures";
import { KeyFiguresCard } from "@/components/key-figures";
import { Card, CardBody, Container, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Föreningens ekonomi",
  description: "Föreningens nyckeltal, avgifter och underhåll.",
};

/**
 * Nyckeltalen (Admin → Ekonomi) och de ekonomirelaterade fälten ur
 * Föreningsinfo. Det som inte är ifyllt hoppas över – hellre kort än påhittad.
 */
export default async function EkonomiPage() {
  const [info, economy] = await Promise.all([
    getAssociationInfo(),
    getEconomyFigures(),
  ]);
  const figures = publishedFigures(economy);

  const blocks = [
    { title: "Avgiften", body: info.feesInfo },
    { title: "Ekonomin i korthet", body: info.economySummary },
  ].filter((b) => b.body);

  return (
    <Section>
      <Container>
        <PageHeader
          title="Föreningens ekonomi"
          description="Nyckeltal, avgiftsnivå, vad som ingår och planerat underhåll."
        />

        <div className="mt-8 max-w-2xl space-y-6">
          <KeyFiguresCard figures={figures} fiscalYear={economy.fiscalYear} />

          {blocks.length === 0 && figures.length === 0 ? (
            <Card>
              <CardBody className="py-6 text-sm text-muted">
                Styrelsen har inte fyllt i uppgifter om ekonomin ännu. De
                fullständiga siffrorna finns i{" "}
                <Link
                  href="/arsredovisningar"
                  className="text-brand-700 hover:underline"
                >
                  årsredovisningarna
                </Link>
                .
              </CardBody>
            </Card>
          ) : (
            blocks.map((b) => (
              <Card key={b.title}>
                <CardBody>
                  <h2 className="font-semibold">{b.title}</h2>
                  <p className="mt-2 text-sm text-foreground">{b.body}</p>
                </CardBody>
              </Card>
            ))
          )}

          {info.renovationsPlanned.length > 0 ? (
            <Card>
              <CardBody>
                <h2 className="font-semibold">Planerat underhåll</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                  {info.renovationsPlanned.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-brand-600">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <p className="text-sm text-muted">
            För fullständiga siffror, se de senaste{" "}
            <Link
              href="/arsredovisningar"
              className="text-brand-700 hover:underline"
            >
              årsredovisningarna
            </Link>
            .
          </p>
        </div>
      </Container>
    </Section>
  );
}
