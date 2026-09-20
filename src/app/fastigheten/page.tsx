import type { Metadata } from "next";
import { getAssociationInfo } from "@/lib/data";
import { Card, CardBody, Container, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Fastigheten",
  description: "Om huset, gemensamma utrymmen och vad som ingår i boendet.",
};

/**
 * Sidan var tidigare ett tomt skal med en text om att innehållet "fylls på av
 * styrelsen". Den visar nu fastighetsfälten ur Föreningsinfo och hoppar över
 * det som inte är ifyllt.
 */
export default async function FastighetenPage() {
  const info = await getAssociationInfo();

  const facts = [
    { label: "Byggår", value: info.builtYear ? String(info.builtYear) : "" },
    {
      label: "Antal lägenheter",
      value: info.apartments ? String(info.apartments) : "",
    },
    { label: "Uppvärmning", value: info.heating },
    { label: "Bredband och TV", value: info.broadband },
    { label: "Parkering", value: info.parking },
    { label: "Tvätt", value: info.laundry },
    { label: "Gemensamma utrymmen", value: info.commonAreas },
    { label: "Energiklass", value: info.energyClass },
  ].filter((f) => f.value);

  return (
    <Section>
      <Container>
        <PageHeader
          title="Fastigheten"
          description="Om huset, gemensamma utrymmen och vad som ingår i boendet."
        />

        <div className="mt-8 max-w-2xl space-y-6">
          {facts.length === 0 ? (
            <Card>
              <CardBody className="py-6 text-sm text-muted">
                Styrelsen har inte fyllt i uppgifter om fastigheten ännu.
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <dl className="divide-y divide-border">
                  {facts.map((f) => (
                    <div
                      key={f.label}
                      className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4"
                    >
                      <dt className="text-sm font-medium text-muted">
                        {f.label}
                      </dt>
                      <dd className="text-sm text-foreground sm:col-span-2">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          )}

          {info.renovationsDone.length > 0 ? (
            <Card>
              <CardBody>
                <h2 className="font-semibold">Genomförda renoveringar</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                  {info.renovationsDone.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
