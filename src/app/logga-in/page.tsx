import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardBody, Container, Section } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Logga in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);
  // requireAdmin/requireApprovedMember skickar hit med ?next=<skyddad sida>.
  const next = safeNextPath(params.next);
  if (user) {
    redirect(next ?? (user.role === "admin" ? "/admin" : "/medlem"));
  }

  return (
    <Section>
      <Container className="max-w-md">
        <h1 className="text-center text-2xl font-bold tracking-tight">
          Logga in
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          För boende och styrelse i föreningen.
        </p>
        <Card className="mt-6">
          <CardBody>
            <LoginForm next={next} />
          </CardBody>
        </Card>
      </Container>
    </Section>
  );
}
