import Link from "next/link";
import type { NewsPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { NewsImage } from "@/components/news-image";

/**
 * Nyhet som ett brett, redaktionellt kort: bild till vänster, text till höger
 * (bilden överst på mobil). Hela kortet är klickbart via en utsträckt länk på
 * rubriken, så att skärmläsare hör en länk per nyhet.
 */
export function NewsFeature({
  post,
  priority = false,
}: {
  post: NewsPost;
  priority?: boolean;
}) {
  const date = post.publishedAt ?? post.createdAt;

  return (
    <article className="news-card group relative grid overflow-hidden rounded-xl border border-line/70 bg-surface has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-moss/40 md:grid-cols-[5fr_7fr]">
      <NewsImage
        src={post.imageUrl}
        sizes="(min-width: 768px) 440px, 100vw"
        priority={priority}
        className="aspect-[4/3] md:aspect-auto md:min-h-72"
      />

      <div className="flex flex-col justify-center px-7 py-8 sm:px-10 sm:py-10 lg:px-12">
        <time
          dateTime={date}
          className="font-body text-xs font-medium uppercase tracking-[0.18em] text-moss"
        >
          {formatDate(date)}
        </time>

        <h2 className="mt-4 font-display text-2xl font-normal leading-snug tracking-tight text-ink transition-colors duration-300 group-hover:text-moss sm:text-[1.75rem] lg:text-3xl">
          <Link
            href={`/nyheter/${post.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {post.title}
          </Link>
        </h2>

        {post.excerpt ? (
          <p className="mt-4 line-clamp-3 font-body text-base leading-[1.7] text-muted">
            {post.excerpt}
          </p>
        ) : null}

        <span
          aria-hidden="true"
          className="mt-7 inline-flex items-center gap-2 font-body text-sm font-medium text-moss"
        >
          Läs mer <span className="news-card-arrow">→</span>
        </span>
      </div>
    </article>
  );
}
