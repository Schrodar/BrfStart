import type { Metadata } from "next";
import Link from "next/link";
import { navGroups } from "@/config/site";
import {
  getAssociationInfo,
  getAssociationProfile,
  getEconomyFigures,
  getSiteContent,
} from "@/lib/data";
import { publishedFigures } from "@/lib/key-figures";
import { KeyFiguresSummary } from "@/components/key-figures";
import { Container, PageHeader, Section } from "@/components/ui";
import { Prose } from "@/components/prose";

export const metadata: Metadata = {
  title: "Om föreningen",
};

/**
 * Nästa steg för den som läst presentationen. Etiketterna hämtas ur menyn,
 * så att länkarna alltid heter samma sak som där.
 */
const navItems: readonly { href: string; label: string }[] = navGroups.flatMap(
  (group): readonly { href: string; label: string }[] => group.items,
);
const READ_MORE = ["/fastigheten", "/styrelse", "/stadgar", "/ekonomi"].flatMap(
  (href) => navItems.filter((item) => item.href === href),
);

export default async function AboutPage() {
  const [content, info, association, economy] = await Promise.all([
    getSiteContent(),
    getAssociationInfo(),
    getAssociationProfile(),
    getEconomyFigures(),
  ]);
  const figures = publishedFigures(economy);

  const facts: { label: string; value: string }[] = [
    { label: "Byggår", value: info.builtYear ? String(info.builtYear) : "" },
    {
      label: "Antal lägenheter",
      value: info.apartments ? String(info.apartments) : "",
    },
    { label: "Föreningsform", value: info.associationType },
    { label: "Mark", value: info.landOwnership },
    { label: "Uppvärmning", value: info.heating },
    { label: "Bredband", value: info.broadband },
    // Tom sträng och 0 betyder "inte ifyllt" – hellre ingen ruta än en ruta
    // med nollor och tomma rader, precis som på Fastigheten och För mäklare.
  ].filter((fact) => fact.value);
  const hasAside = facts.length > 0 || figures.length > 0;

  return (
    <Section>
      <Container>
        <PageHeader
          title="Om föreningen"
          description={[association.name, association.city]
            .filter(Boolean)
            .join(", ")}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-3">
          <div className={hasAside ? "lg:col-span-2" : "lg:col-span-3"}>
            {content.aboutBody ? (
              <Prose content={content.aboutBody} />
            ) : (
              <p className="text-sm text-muted">
                Styrelsen har inte skrivit någon presentation ännu.
              </p>
            )}
          </div>

          {hasAside ? (
            <aside className="space-y-6 lg:col-span-1">
              {facts.length > 0 ? (
                <div className="rounded-card border border-border bg-surface p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    Snabbfakta
                  </h2>
                  <dl className="mt-4 space-y-3">
                    {facts.map((fact) => (
                      <div key={fact.label}>
                        <dt className="text-xs text-muted">{fact.label}</dt>
                        <dd className="text-sm font-medium text-foreground">
                          {fact.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href="/fastigheten"
                    className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline"
                  >
                    Fler fakta om fastigheten →
                  </Link>
                </div>
              ) : null}
              <KeyFiguresSummary figures={figures} fiscalYear={economy.fiscalYear} />
            </aside>
          ) : null}
        </div>

        <nav
          aria-label="Mer om föreningen"
          className="mt-10 border-t border-border pt-6"
        >
          <p className="text-sm font-semibold text-foreground">Läs mer</p>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {READ_MORE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {item.label} →
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </Section>
  );
}
