// NAVIGERING: src/app/page.tsx

import Link from "next/link";
import { getPublishedListings, getPublishedNews, getSiteContent } from "@/lib/data";
import { Container, Section } from "@/components/ui";
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
              <p className="text-lg leading-relaxed text-foreground">
                {content.welcomeBody}
              </p>
            </div>
          </Container>
        ) : null}
      </Section>

      {/* Snabblänkar */}
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-card border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <p className="font-semibold text-foreground group-hover:text-brand-700">
                {link.title}
              </p>
              <p className="mt-1.5 text-sm text-muted">{link.text}</p>
            </Link>
          ))}
        </div>
      </Container>

      {/* Till salu */}
      {forSale.length > 0 ? (
        <Section>
          <Container>
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Till salu</h2>
              <Link
                href="/till-salu"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Alla lägenheter →
              </Link>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">Senaste nytt</h2>
            <Link
              href="/nyheter"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Alla nyheter →
            </Link>
          </div>

          {latest.length > 0 ? (
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {latest.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-muted">Inga nyheter publicerade ännu.</p>
          )}
        </Container>
      </Section>
    </>
  );
}
