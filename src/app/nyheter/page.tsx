import type { Metadata } from "next";
import { getPublishedNews } from "@/lib/data";
import { Container, EmptyState, PageHeader, Section } from "@/components/ui";
import { NewsCard } from "@/components/news-card";

export const metadata: Metadata = {
  title: "Nyheter",
};

export default async function NewsPage() {
  const news = await getPublishedNews();

  return (
    <Section>
      <Container>
        <PageHeader
          title="Nyheter"
          description="Aktuellt från styrelsen och information till boende."
        />
        {news.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState title="Inga nyheter publicerade ännu" />
          </div>
        )}
      </Container>
    </Section>
  );
}
