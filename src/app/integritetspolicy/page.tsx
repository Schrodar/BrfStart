import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import { EmailLink } from "@/components/association";
import { getAssociationProfile } from "@/lib/data";
import { Container, PageHeader, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Integritetspolicy",
};

export default async function PrivacyPage() {
  const association = await getAssociationProfile();

  return (
    <Section>
      <Container className="max-w-3xl">
        <PageHeader title="Integritetspolicy" />

        <div className="prose mt-8 text-foreground">
          <p>
            {association.name}
            {association.organizationNumber
              ? ` (org.nr ${association.organizationNumber})`
              : ""}{" "}
            värnar om din personliga integritet. Här beskrivs hur vi behandlar
            personuppgifter enligt dataskyddsförordningen (GDPR).
          </p>

          <h2>Personuppgiftsansvarig</h2>
          <p>
            Styrelsen för {association.name} är personuppgiftsansvarig.{" "}
            {association.contactEmail ? (
              <>
                Du når oss på <EmailLink email={association.contactEmail} />.
              </>
            ) : (
              <>
                Kontaktuppgifter finns på{" "}
                <Link href={siteConfig.links.contact}>kontaktsidan</Link>.
              </>
            )}
          </p>

          <h2>Vilka uppgifter vi behandlar</h2>
          <ul>
            <li>
              <strong>Medlemskonton:</strong> namn, e-postadress och
              lägenhetsnummer för att ge boende åtkomst till medlemssidorna.
            </li>
            <li>
              <strong>Felanmälningar:</strong> namn, kontaktuppgifter och
              beskrivning av ärendet för att kunna åtgärda fel.
            </li>
          </ul>

          <h2>Ändamål och laglig grund</h2>
          <p>
            Uppgifterna används endast för att förvalta föreningen och ge service
            till boende. Laglig grund är berättigat intresse samt fullgörande av
            föreningens åtaganden gentemot medlemmarna.
          </p>

          <h2>Lagringstid</h2>
          <p>
            Vi sparar uppgifterna så länge de behövs för ändamålet:
            felanmälningar under ärendets gång och en tid därefter, och
            medlemskonton så länge du bor i föreningen. Styrelsen gallrar
            uppgifter som inte längre behövs, och du kan alltid be oss radera
            dina uppgifter.
          </p>

          <h2>Dina rättigheter</h2>
          <p>
            Du har rätt att begära registerutdrag, rättelse eller radering av dina
            uppgifter. Kontakta styrelsen så hjälper vi dig. Du kan även vända dig
            till Integritetsskyddsmyndigheten (IMY) om du har klagomål.
          </p>

          <p className="text-sm text-muted">
            Detta är en mall som bör anpassas efter föreningens faktiska
            behandling innan publicering.
          </p>
        </div>
      </Container>
    </Section>
  );
}
