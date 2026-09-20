import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import { EmailLink, EmergencyContact, PhoneLink } from "@/components/association";
import { getAssociationProfile, getMaintenanceSettings } from "@/lib/data";
import { hasPropertyManager, listText } from "@/lib/utils";
import { Card, CardBody, Container, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kontakt",
};

export default async function ContactPage() {
  const [association, settings] = await Promise.all([
    getAssociationProfile(),
    getMaintenanceSettings(),
  ]);
  const address = [
    association.street,
    [association.postalCode, association.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  // Räkna bara upp de kontakter som faktiskt visas – en förening utan
  // förvaltare ska inte hänvisas till någon som inte finns.
  const manager = hasPropertyManager(association);
  const contacts = listText([
    "styrelsen",
    manager ? "förvaltaren" : "",
    settings.caretakerPhone ? "fastighetsskötaren" : "",
  ]);

  return (
    <Section>
      <Container>
        <PageHeader title="Kontakt" description={`Så här når du ${contacts}.`} />

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold">Styrelsen</h2>
              <p className="mt-2 text-sm text-muted">
                Skriv till styrelsen via e-post, eller lämna en lapp i
                föreningens brevlåda i entrén.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {association.contactEmail ? (
                  <li>
                    <span className="text-muted">E-post: </span>
                    <EmailLink
                      email={association.contactEmail}
                      className="text-brand-700 hover:underline"
                    />
                  </li>
                ) : null}
                {association.contactPhone ? (
                  <li>
                    <span className="text-muted">Telefon: </span>
                    <PhoneLink
                      phone={association.contactPhone}
                      className="text-brand-700 hover:underline"
                    />
                  </li>
                ) : null}
                {address ? (
                  <li>
                    <span className="text-muted">Adress: </span>
                    {address}
                  </li>
                ) : null}
              </ul>
              <p className="mt-4 text-sm text-muted">
                Gäller det ett fel i fastigheten? Använd{" "}
                <Link
                  href={siteConfig.links.faultReport}
                  className="text-brand-700 hover:underline"
                >
                  felanmälan
                </Link>
                .
              </p>
            </CardBody>
          </Card>

          {manager ? (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold">Förvaltare</h2>
                <p className="mt-2 text-sm text-muted">
                  Ekonomisk och teknisk förvaltning sköts av vår förvaltare.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {association.propertyManagerName ? (
                    <li className="font-medium text-foreground">
                      {association.propertyManagerName}
                    </li>
                  ) : null}
                  {association.propertyManagerPhone ? (
                    <li>
                      <span className="text-muted">Telefon: </span>
                      <PhoneLink
                        phone={association.propertyManagerPhone}
                        className="text-brand-700 hover:underline"
                      />
                    </li>
                  ) : null}
                  {association.propertyManagerEmail ? (
                    <li>
                      <span className="text-muted">E-post: </span>
                      <EmailLink
                        email={association.propertyManagerEmail}
                        className="text-brand-700 hover:underline"
                      />
                    </li>
                  ) : null}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {/* Egen ruta: jouren gäller hela föreningen och ska synas även för
              den som sköter förvaltningen själv. */}
          {settings.emergencyPhone ? (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold">Jour vid akuta fel</h2>
                <EmergencyContact
                  phone={settings.emergencyPhone}
                  description={settings.emergencyText}
                  label="Telefon:"
                  className="mt-4"
                />
              </CardBody>
            </Card>
          ) : null}

          {/* Samma uppgifter och samma regel som på felanmälningssidan: utan
              telefonnummer ingen ruta. Redigeras under Felanmälningar i admin. */}
          {settings.caretakerPhone ? (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold">Fastighetsskötare</h2>
                {settings.caretakerText ? (
                  <p className="mt-2 text-sm text-muted">
                    {settings.caretakerText}
                  </p>
                ) : null}
                <ul className="mt-4 space-y-2 text-sm">
                  {settings.caretakerName ? (
                    <li className="font-medium text-foreground">
                      {settings.caretakerName}
                    </li>
                  ) : null}
                  <li>
                    <span className="text-muted">Telefon: </span>
                    <PhoneLink
                      phone={settings.caretakerPhone}
                      className="text-brand-700 hover:underline"
                    />
                  </li>
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
