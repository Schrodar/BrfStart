import Link from "next/link";
import { buttonClasses, Container, Section } from "@/components/ui";

export default function NotFound() {
  return (
    <Section>
      <Container className="max-w-lg text-center">
        <p className="eyebrow">
          404
        </p>
        <h1 className="title-page mt-4">
          Sidan hittades inte
        </h1>
        <p className="lead mt-5">
          Sidan du letar efter finns inte eller har flyttats.
        </p>
        <Link href="/" className={`${buttonClasses("primary", "md")} mt-8`}>
          Till startsidan
        </Link>
      </Container>
    </Section>
  );
}
