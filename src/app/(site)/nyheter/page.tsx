import type { Metadata } from "next";
import { getPublishedNews } from "@/lib/data";
import { Container, PageIntro, Section } from "@/components/ui";
import { NewsFeature } from "@/components/news-feature";

export const metadata: Metadata = {
  title: "Nyheter",
};

/** Nyhetslistan: breda, redaktionella kort med bild till vänster. */
export default async function NewsPage() {
  const news = await getPublishedNews();

  return (
    <Section>
      <Container>
        <PageIntro
          eyebrow="Aktuellt"
          title="Nyheter"
          description="Aktuellt från styrelsen och information till boende."
        />

        {news.length > 0 ? (
          <div className="mt-12 space-y-8 sm:mt-16 sm:space-y-10">
            {news.map((post, index) => (
              <NewsFeature key={post.id} post={post} priority={index === 0} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-card border border-border bg-surface/60 px-6 py-14 text-center sm:mt-16">
            <p className="title-card">Inga nyheter ännu</p>
            <p className="mt-2 text-sm text-muted">
              Styrelsens nyheter och information till boende visas här.
            </p>
          </div>
        )}
      </Container>
    </Section>
  );
}
