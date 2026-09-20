import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedNewsBySlug } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Container, Section } from "@/components/ui";
import { Prose } from "@/components/prose";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedNewsBySlug(slug);
  if (!post) return { title: "Nyhet saknas" };
  return { title: post.title, description: post.excerpt };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedNewsBySlug(slug);
  if (!post) notFound();

  return (
    <Section>
      <Container className="max-w-3xl">
        <Link
          href="/nyheter"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Alla nyheter
        </Link>

        <article className="mt-4">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            {formatDate(post.publishedAt ?? post.createdAt)}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            {post.title}
          </h1>
          <p className="mt-3 text-lg text-muted">{post.excerpt}</p>
          <hr className="my-6 border-border" />
          <Prose content={post.body} />
        </article>
      </Container>
    </Section>
  );
}
