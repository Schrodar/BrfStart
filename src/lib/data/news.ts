import type { NewsPost as DbNewsPost } from "@prisma/client";
import type { NewsPost } from "@/lib/types";
import { getTenantDb } from "@/lib/tenant";
import { makeId, slugify } from "@/lib/utils";

function toNews(n: DbNewsPost): NewsPost {
  return {
    id: n.id,
    slug: n.slug,
    title: n.title,
    excerpt: n.excerpt,
    body: n.body,
    published: n.published,
    publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

/** Publicerade nyheter, nyast först (publik vy). */
export async function getPublishedNews(): Promise<NewsPost[]> {
  const { db } = await getTenantDb();
  const rows = await db.newsPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });
  return rows.map(toNews);
}

/** Alla nyheter inkl. utkast (admin). */
export async function getAllNews(): Promise<NewsPost[]> {
  const { db } = await getTenantDb();
  const rows = await db.newsPost.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toNews);
}

export async function getPublishedNewsBySlug(
  slug: string,
): Promise<NewsPost | null> {
  const { db } = await getTenantDb();
  const row = await db.newsPost.findFirst({ where: { slug, published: true } });
  return row ? toNews(row) : null;
}

export async function getNewsById(id: string): Promise<NewsPost | null> {
  const { db } = await getTenantDb();
  const row = await db.newsPost.findFirst({ where: { id } });
  return row ? toNews(row) : null;
}

export interface NewsInput {
  title: string;
  excerpt: string;
  body: string;
  published: boolean;
}

export async function createNews(input: NewsInput): Promise<NewsPost> {
  const { db, associationId } = await getTenantDb();
  let slug = slugify(input.title);
  if (await db.newsPost.findFirst({ where: { slug } })) {
    slug = `${slug}-${makeId("")}`;
  }
  const row = await db.newsPost.create({
    data: {
      associationId,
      slug,
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      published: input.published,
      publishedAt: input.published ? new Date() : null,
    },
  });
  return toNews(row);
}

export async function updateNews(
  id: string,
  input: NewsInput,
): Promise<NewsPost | null> {
  const { db } = await getTenantDb();
  const existing = await db.newsPost.findFirst({ where: { id } });
  if (!existing) return null;

  let publishedAt = existing.publishedAt;
  if (input.published && !existing.published) publishedAt = new Date();
  if (!input.published) publishedAt = null;

  await db.newsPost.updateMany({
    where: { id },
    data: {
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      published: input.published,
      publishedAt,
    },
  });
  const row = await db.newsPost.findFirst({ where: { id } });
  return row ? toNews(row) : null;
}

export async function deleteNews(id: string): Promise<void> {
  const { db } = await getTenantDb();
  await db.newsPost.deleteMany({ where: { id } });
}
