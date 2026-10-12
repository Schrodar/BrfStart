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
import { Container, PageIntro, Section } from "@/components/ui";
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
        <PageIntro
          eyebrow="Föreningen"
          title="Om föreningen"
          description={[association.name, association.city]
            .filter(Boolean)
            .join(", ")}
        />

        <div className="mt-12 grid gap-12 lg:grid-cols-3">
          <div className={hasAside ? "lg:col-span-2" : "lg:col-span-3"}>
            {content.aboutBody ? (
              <Prose content={content.aboutBody} className="prose-editorial" />
            ) : (
              <p className="text-sm text-muted">
                Styrelsen har inte skrivit någon presentation ännu.
              </p>
            )}
          </div>

          {hasAside ? (
            <aside className="space-y-6 lg:col-span-1">
              {facts.length > 0 ? (
                <div className="rounded-card border border-border bg-surface p-6 shadow-[var(--card-shadow)]">
                  <h2 className="eyebrow">Snabbfakta</h2>
                  <dl className="mt-5 space-y-4">
                    {facts.map((fact) => (
                      <div key={fact.label}>
                        <dt className="text-xs text-muted">{fact.label}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-foreground">
                          {fact.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href="/fastigheten"
                    className="link-more mt-5"
                  >
                    Fler fakta om fastigheten <span aria-hidden="true" className="arrow">→</span>
                  </Link>
                </div>
              ) : null}
              <KeyFiguresSummary figures={figures} fiscalYear={economy.fiscalYear} />
            </aside>
          ) : null}
        </div>

        <nav
          aria-label="Mer om föreningen"
          className="mt-16 border-t border-border pt-8"
        >
          <p className="eyebrow">Läs mer</p>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {READ_MORE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="link-more"
                >
                  {item.label} <span aria-hidden="true" className="arrow">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </Section>
  );
}
