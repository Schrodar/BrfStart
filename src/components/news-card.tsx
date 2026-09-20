import Link from "next/link";
import type { NewsPost } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Card, CardBody, CardTitle } from "@/components/ui";

export function NewsCard({ post }: { post: NewsPost }) {
  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardBody className="flex flex-1 flex-col">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
          {formatDate(post.publishedAt ?? post.createdAt)}
        </p>
        <CardTitle className="mt-1">
          <Link href={`/nyheter/${post.slug}`} className="hover:text-brand-700">
            {post.title}
          </Link>
        </CardTitle>
        <p className="mt-2 flex-1 text-sm text-muted">{post.excerpt}</p>
        <Link
          href={`/nyheter/${post.slug}`}
          className="mt-4 text-sm font-medium text-brand-700 hover:underline"
        >
          Läs mer →
        </Link>
      </CardBody>
    </Card>
  );
}
