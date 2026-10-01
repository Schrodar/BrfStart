import type { Metadata } from "next";
import { PhoneLink } from "@/components/association";
import {
  getMaintenanceCategories,
  getMaintenanceSettings,
} from "@/lib/data/maintenance";
import { Card, CardBody, Container, PageHeader, Section } from "@/components/ui";
import { MaintenanceForm } from "./maintenance-form";

export const metadata: Metadata = {
  title: "Felanmälan",
  description:
    "Anmäl fel i fastigheten eller gemensamma utrymmen till styrelsen.",
};

export default async function MaintenancePage() {
  // Sidan är statisk. Den inloggade läses i formuläret, i webbläsaren.
  const [settings, categories] = await Promise.all([
    getMaintenanceSettings(),
    getMaintenanceCategories(),
  ]);

  return (
    <Section>
      <Container className="max-w-3xl">
        <PageHeader
          title="Felanmälan"
          description="Anmäl fel i fastigheten eller de gemensamma utrymmena till styrelsen."
        />

        {/* Ansvarsgränsen först – den avgör om besökaren ska anmäla här alls. */}
        {settings.introText ? (
          <Card className="mt-6">
            <CardBody className="py-4">
              <p className="text-sm text-foreground">{settings.introText}</p>
            </CardBody>
          </Card>
        ) : null}

        {/* Tomt nummer döljer rutan helt. */}
        {settings.emergencyPhone ? (
          <Card className="mt-4 border-amber-200 bg-amber-50">
            <CardBody className="py-4">
              <p className="text-sm text-amber-900">
                <strong>Akut fel</strong> (t.ex. vattenläcka eller stopp i
                hiss) utanför kontorstid – ring jouren på{" "}
                <PhoneLink
                  phone={settings.emergencyPhone}
                  className="font-semibold underline"
                />
                .
              </p>
              {settings.emergencyText ? (
                <p className="mt-1 text-xs text-amber-900/80">
                  {settings.emergencyText}
                </p>
              ) : null}
            </CardBody>
          </Card>
        ) : null}

        {settings.caretakerPhone ? (
          <Card className="mt-4">
            <CardBody className="space-y-1 py-4">
              <p className="text-sm text-foreground">
                <strong>Fastighetsskötare</strong>
                {settings.caretakerName ? ` – ${settings.caretakerName}` : null}:{" "}
                <PhoneLink
                  phone={settings.caretakerPhone}
                  className="font-medium text-brand-700 underline"
                />
              </p>
              {settings.caretakerText ? (
                <p className="text-xs text-muted">{settings.caretakerText}</p>
              ) : null}
            </CardBody>
          </Card>
        ) : null}

        <div className="mt-8">
          {categories.length === 0 ? (
            <Card>
              <CardBody className="py-8 text-center text-sm text-muted">
                Felanmälan är inte öppen ännu – styrelsen behöver lägga upp
                kategorier först.
              </CardBody>
            </Card>
          ) : (
            <MaintenanceForm categories={categories} />
          )}
        </div>
      </Container>
    </Section>
  );
}
