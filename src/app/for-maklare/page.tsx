import type { Metadata } from "next";
import { getAssociationInfo, getAssociationProfile } from "@/lib/data";
import { hasPropertyManager } from "@/lib/utils";
import { EmailLink, PhoneLink } from "@/components/association";
import { Card, CardBody, Container, PageIntro, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "För mäklare och köpare",
  description:
    "Föreningsfakta för mäklare och spekulanter – ekonomi, avgifter, renoveringar och kontaktuppgifter.",
};

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="text-sm text-foreground sm:col-span-2">{value}</dd>
    </div>
  );
}

export default async function BrokerPage() {
  const [info, association] = await Promise.all([
    getAssociationInfo(),
    getAssociationProfile(),
  ]);
  // Hänvisa bara till förvaltaren när föreningen har en.
  const manager = hasPropertyManager(association);

  // Ofyllda uppgifter visas inte. Tom sträng och 0 betyder "inte ifyllt" –
  // hellre en kort sida än ett påhittat byggår inför en spekulant.
  const allFacts: { label: string; value: string }[] = [
    { label: "Föreningens namn", value: association.name },
    {
      label: "Organisationsnummer",
      value: association.organizationNumber,
    },
    { label: "Föreningsform", value: info.associationType },
    { label: "Byggår", value: String(info.builtYear) },
    { label: "Antal lägenheter", value: String(info.apartments) },
    { label: "Mark", value: info.landOwnership },
    { label: "Uppvärmning", value: info.heating },
    { label: "Bredband/TV", value: info.broadband },
    { label: "Parkering", value: info.parking },
    { label: "Tvätt", value: info.laundry },
    { label: "Gemensamma utrymmen", value: info.commonAreas },
    { label: "Energiklass", value: info.energyClass },
    { label: "Husdjur / andrahand", value: info.pets },
  ];
  const facts = allFacts.filter((f) => f.value && f.value !== "0");

  return (
    <Section>
      <Container>
        <PageIntro
          eyebrow="Köpa bostad"
          title="För mäklare och köpare"
          description={`Här samlar vi den information mäklare och spekulanter oftast efterfrågar. För frågor om en specifik lägenhet, kontakta ${manager ? "föreningens förvaltare" : "styrelsen"}.`}
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardBody>
                <h2 className="title-card">Föreningsfakta</h2>
                {facts.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    Föreningen har inte fyllt i sina uppgifter ännu. Kontakta{" "}
                    {manager ? "styrelsen eller förvaltaren" : "styrelsen"} för
                    aktuell information.
                  </p>
                ) : (
                  <dl className="mt-2 divide-y divide-border">
                    {facts.map((fact) => (
                      <FactRow key={fact.label} {...fact} />
                    ))}
                  </dl>
                )}
              </CardBody>
            </Card>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {info.renovationsDone.length > 0 ? (
              <Card>
                <CardBody>
                  <h3 className="title-card">Genomförda renoveringar</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                    {info.renovationsDone.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-moss">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
              ) : null}
              {info.renovationsPlanned.length > 0 ? (
              <Card>
                <CardBody>
                  <h3 className="title-card">Planerat underhåll</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                    {info.renovationsPlanned.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-moss">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
              ) : null}
            </div>
          </div>

          <aside className="space-y-6">
            {info.feesInfo || info.economySummary ? (
              <Card>
                <CardBody>
                  <h3 className="title-card">Avgift och ekonomi</h3>
                  {info.feesInfo ? (
                    <p className="mt-2 text-sm text-foreground">
                      {info.feesInfo}
                    </p>
                  ) : null}
                  {info.economySummary ? (
                    <p className="mt-3 text-sm text-foreground">
                      {info.economySummary}
                    </p>
                  ) : null}
                </CardBody>
              </Card>
            ) : null}

            {manager ? (
              <Card>
                <CardBody>
                  <h3 className="title-card">Förvaltare</h3>
                  {association.propertyManagerName ? (
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {association.propertyManagerName}
                    </p>
                  ) : null}
                  <ul className="mt-1 space-y-1 text-sm text-muted">
                    {association.propertyManagerPhone ? (
                      <li>
                        <PhoneLink phone={association.propertyManagerPhone} />
                      </li>
                    ) : null}
                    {association.propertyManagerEmail ? (
                      <li>
                        <EmailLink
                          email={association.propertyManagerEmail}
                          className="link-inline"
                        />
                      </li>
                    ) : null}
                  </ul>
                </CardBody>
              </Card>
            ) : null}
          </aside>
        </div>
      </Container>
    </Section>
  );
}
