import type { Metadata } from "next";
import { Card, CardBody, Container, Section } from "@/components/ui";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Registrera",
};

export default function RegisterPage() {
  return (
    <Section>
      <Container className="max-w-md">
        <h1 className="title-page text-center text-[2.5rem] sm:text-[3rem]">
          Skapa konto
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          För dig som bor i föreningen. Ditt konto aktiveras när styrelsen
          godkänt registreringen.
        </p>
        <Card className="mt-6">
          <CardBody>
            <RegisterForm />
          </CardBody>
        </Card>
      </Container>
    </Section>
  );
}
