import Link from "next/link";
import { buttonClasses, Container, Section } from "@/components/ui";
import { SiteChrome } from "@/components/layout/site-chrome";

// Ligger i roten för att fånga alla okända adresser, och får därför inte
// (site)-layouten – header och footer läggs på här i stället.
export default function NotFound() {
  return (
    <SiteChrome>
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
    </SiteChrome>
  );
}
