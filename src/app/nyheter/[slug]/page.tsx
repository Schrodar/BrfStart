import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedNewsBySlug } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Container } from "@/components/ui";
import { Prose } from "@/components/prose";

interface Props {
  params: Promise<{ slug: string }>;
}

// Inga artiklar byggs i förväg. Var och en renderas vid första besöket och
// cachas sedan; admin bygger om dem när en nyhet ändras.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedNewsBySlug(slug);
  if (!post) return { title: "Nyhet saknas" };
  return {
    title: post.title,
    description: post.excerpt,
    ...(post.imageUrl ? { openGraph: { images: [post.imageUrl] } } : {}),
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedNewsBySlug(slug);
  if (!post) notFound();

  const date = post.publishedAt ?? post.createdAt;

  return (
    <article className="bg-bone pb-20 sm:pb-28">
      <Container className="max-w-3xl pt-12 sm:pt-16">
        <Link
          href="/nyheter"
          className="group inline-flex items-center gap-2 font-body text-sm font-medium text-muted transition-colors hover:text-moss"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-1">
            ←
          </span>
          Alla nyheter
        </Link>

        <header className="mt-10 sm:mt-14">
          <time
            dateTime={date}
            className="font-body text-xs font-medium uppercase tracking-[0.18em] text-moss"
          >
            {formatDate(date)}
          </time>
          <h1 className="mt-4 font-display text-4xl font-light leading-[1.08] tracking-tight text-ink sm:text-5xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="mt-6 font-body text-xl leading-relaxed text-muted">
              {post.excerpt}
            </p>
          ) : null}
        </header>
      </Container>

      {post.imageUrl ? (
        <Container className="mt-12 max-w-5xl sm:mt-14">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-sand/60">
            <Image
              src={post.imageUrl}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 976px, 100vw"
              className="object-cover"
            />
          </div>
        </Container>
      ) : null}

      <Container className="max-w-3xl">
        <div className="mt-12 border-t border-line pt-10 sm:mt-14 sm:pt-12">
          <Prose content={post.body} className="prose-editorial font-body text-ink" />
        </div>
      </Container>
    </article>
  );
}
