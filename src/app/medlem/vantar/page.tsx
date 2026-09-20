import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui";

export default async function AwaitingApprovalPage() {
  const user = await requireUser();
  if (user.status === "approved") redirect("/medlem");

  return (
    <Card>
      <CardBody className="py-8 text-center">
        <p className="text-lg font-semibold">Ditt konto väntar på godkännande</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Tack för din registrering! Styrelsen granskar din ansökan och
          aktiverar kontot så snart som möjligt. Du får ett mejl när du kan logga
          in och nå medlemssidorna.
        </p>
      </CardBody>
    </Card>
  );
}
