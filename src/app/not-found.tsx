import Link from "next/link";
import { buttonClasses, Container, Section } from "@/components/ui";

export default function NotFound() {
  return (
    <Section>
      <Container className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Sidan hittades inte
        </h1>
        <p className="mt-3 text-muted">
          Sidan du letar efter finns inte eller har flyttats.
        </p>
        <Link href="/" className={`${buttonClasses("primary", "md")} mt-6`}>
          Till startsidan
        </Link>
      </Container>
    </Section>
  );
}
