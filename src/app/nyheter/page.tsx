import type { Metadata } from "next";
import { getPublishedNews } from "@/lib/data";
import { Container } from "@/components/ui";
import { NewsFeature } from "@/components/news-feature";

export const metadata: Metadata = {
  title: "Nyheter",
};

/**
 * Nyhetslistan: redaktionell och lugn – varm benvit bakgrund, stor
 * serifrubrik och breda kort med bild till vänster.
 */
export default async function NewsPage() {
  const news = await getPublishedNews();

  return (
    <section className="bg-bone">
      <Container className="py-16 sm:py-24">
        <header>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.22em] text-moss">
            Aktuellt
          </p>
          <h1 className="mt-4 font-display text-5xl font-light leading-[1.02] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Nyheter
          </h1>
          <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-muted">
            Aktuellt från styrelsen och information till boende.
          </p>
        </header>

        <div className="mt-12 border-t border-line sm:mt-16" />

        {news.length > 0 ? (
          <div className="mt-12 space-y-8 sm:mt-16 sm:space-y-10">
            {news.map((post, index) => (
              <NewsFeature key={post.id} post={post} priority={index === 0} />
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-xl border border-line/70 bg-surface/60 px-6 py-14 text-center sm:mt-16">
            <p className="font-display text-2xl font-light text-ink">
              Inga nyheter ännu
            </p>
            <p className="mt-2 font-body text-sm text-muted">
              Styrelsens nyheter och information till boende visas här.
            </p>
          </div>
        )}
      </Container>
    </section>
  );
}
