import type { Metadata } from "next";
import { getOpenInvitation } from "@/lib/data";
import { Card, CardBody, Container, Section } from "@/components/ui";
import { ActivateForm } from "./activate-form";

/**
 * Inbjudningar från plattformspanelen. Länken bär en engångstoken i adressen,
 * så sidan skickar aldrig vidare den i en referrer och ska inte indexeras.
 */
export const metadata: Metadata = {
  title: "Aktivera konto",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const invitation = await getOpenInvitation(token);

  return (
    <Section>
      <Container className="max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          Aktivera ditt konto
        </h1>

        {invitation ? (
          <>
            <p className="mt-2 text-center text-sm text-muted">
              {invitation.role === "admin"
                ? "Du har bjudits in som styrelseadmin. Välj ett lösenord, så kommer du direkt till adminpanelen."
                : "Du har bjudits in som boende. Välj ett lösenord, så kommer du direkt till Mina sidor."}
            </p>
            <Card className="mt-6">
              <CardBody>
                <ActivateForm
                  token={token}
                  email={invitation.email}
                  fullName={invitation.fullName}
                  apartment={invitation.apartment}
                  isAdmin={invitation.role === "admin"}
                />
              </CardBody>
            </Card>
          </>
        ) : (
          // Samma svar för okänd, använd, återkallad och utgången länk – då
          // avslöjar sidan inget om vilka inbjudningar som finns.
          <Card className="mt-6">
            <CardBody className="py-6 text-center text-sm text-muted">
              Länken är ogiltig eller har gått ut. Be den som bjöd in dig om en
              ny länk.
            </CardBody>
          </Card>
        )}
      </Container>
    </Section>
  );
}
