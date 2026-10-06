import Link from "next/link";
import type { NewsPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { NewsImage } from "@/components/news-image";

/**
 * Kompakt nyhetskort för startsidan (tre i rad): bild överst och samma
 * hierarki och uttryck som de breda korten på /nyheter.
 */
export function NewsCard({ post }: { post: NewsPost }) {
  const date = post.publishedAt ?? post.createdAt;

  return (
    <article className="card-lift group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-[var(--card-shadow)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-moss/40">
      <NewsImage
        src={post.imageUrl}
        sizes="(min-width: 768px) 340px, 100vw"
        className="aspect-[3/2]"
      />

      <div className="flex flex-1 flex-col px-6 py-6">
        <time
          dateTime={date}
          className="font-body text-xs font-medium uppercase tracking-[0.18em] text-moss"
        >
          {formatDate(date)}
        </time>

        <h3 className="mt-3 font-display text-xl font-normal leading-snug tracking-tight text-ink transition-colors duration-300 group-hover:text-moss">
          <Link
            href={`/nyheter/${post.slug}`}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {post.title}
          </Link>
        </h3>

        {post.excerpt ? (
          <p className="mt-3 line-clamp-3 flex-1 font-body text-sm leading-relaxed text-muted">
            {post.excerpt}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <span
          aria-hidden="true"
          className="mt-5 inline-flex items-center gap-2 font-body text-sm font-medium text-moss"
        >
          Läs mer <span className="card-lift-arrow">→</span>
        </span>
      </div>
    </article>
  );
}
