// NAVIGERING: src/app/page.tsx

import Link from "next/link";
import { getPublishedListings, getPublishedNews, getSiteContent } from "@/lib/data";
import { Container, Section, SectionHeading } from "@/components/ui";
import { NewsCard } from "@/components/news-card";
import { ListingCard } from "@/components/apartment/listing-card";

const quickLinks = [
  {
    href: "/felanmalan",
    title: "Felanmälan",
    text: "Anmäl fel i fastigheten eller gemensamma utrymmen.",
  },
  {
    href: "/dokument",
    title: "Dokument",
    text: "Stadgar, årsredovisning, ordningsregler med mera.",
  },
  {
    href: "/for-maklare",
    title: "För mäklare",
    text: "Föreningsfakta för mäklare och spekulanter.",
  },
  {
    href: "/medlem",
    title: "Medlemssidor",
    text: "Din lägenhet och föreningens interna dokument.",
  },
];

export default async function HomePage() {
  const [content, news, listings] = await Promise.all([
    getSiteContent(),
    getPublishedNews(),
    getPublishedListings(),
  ]);
  const latest = news.slice(0, 3);
  const forSale = listings.slice(0, 3);

  return (
    <>
      {/*
        Den gamla heron är borttagen härifrån.
        Helskärmsheron renderas nu av SiteHeader i src/app/layout.tsx.
      */}

      {/* Välkomsttext – ankaret används av pilen längst ned i heron och måste
          finnas även när texten saknas, annars hamnar pilen i ingenting. */}
      <Section id="start-content" className="scroll-mt-4">
        {content.welcomeBody ? (
          <Container>
            <div className="max-w-3xl">
              <p className="eyebrow">Välkommen</p>
              <p className="mt-5 font-display text-2xl font-light leading-snug tracking-tight text-ink sm:text-[1.75rem]">
                {content.welcomeBody}
              </p>
            </div>
          </Container>
        ) : null}
      </Section>

      {/* Snabblänkar */}
      <Container>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card-lift group flex flex-col rounded-card border border-border bg-surface p-6 shadow-[var(--card-shadow)]"
            >
              <p className="title-card transition-colors duration-300 group-hover:text-moss">
                {link.title}
              </p>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{link.text}</p>
              <span aria-hidden="true" className="card-lift-arrow mt-5 text-sm text-moss">
                →
              </span>
            </Link>
          ))}
        </div>
      </Container>

      {/* Till salu */}
      {forSale.length > 0 ? (
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Bostäder"
              title="Till salu"
              href="/till-salu"
              linkLabel="Alla lägenheter"
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {forSale.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}

      {/* Senaste nyheter */}
      <Section>
        <Container>
          <SectionHeading
            eyebrow="Aktuellt"
            title="Senaste nytt"
            href="/nyheter"
            linkLabel="Alla nyheter"
          />

          {latest.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {latest.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="mt-10 text-muted">Inga nyheter publicerade ännu.</p>
          )}
        </Container>
      </Section>
    </>
  );
}
