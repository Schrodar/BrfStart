import type { Metadata } from "next";
import { getPublishedListings } from "@/lib/data";
import { Container, EmptyState, PageIntro, Section } from "@/components/ui";
import { ListingCard } from "@/components/apartment/listing-card";

export const metadata: Metadata = {
  title: "Till salu",
  description: "Lägenheter till salu i föreningen.",
};

export default async function ForSalePage() {
  const listings = await getPublishedListings();

  return (
    <Section>
      <Container>
        <PageIntro
          eyebrow="Köpa bostad"
          title="Lägenheter till salu"
          description="Lediga lägenheter i föreningen. Kontakta ansvarig mäklare för visning och mer information."
        />

        {listings.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              title="Inga lägenheter till salu just nu"
              description="Håll utkik – nya annonser dyker upp här."
            />
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}
