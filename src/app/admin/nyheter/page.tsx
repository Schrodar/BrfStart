import Link from "next/link";
import { getAllNews } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  buttonClasses,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { deleteNewsAction } from "./actions";

export default async function AdminNewsPage() {
  const news = await getAllNews();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nyheter"
        actions={
          <Link href="/admin/nyheter/ny" className={buttonClasses("primary", "sm")}>
            Ny nyhet
          </Link>
        }
      />

      {news.length === 0 ? (
        <EmptyState title="Inga nyheter ännu" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Rubrik</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {news.map((post) => (
                <tr key={post.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {post.title}
                  </td>
                  <td className="px-4 py-3">
                    {post.published ? (
                      <Badge tone="success">Publicerad</Badge>
                    ) : (
                      <Badge tone="warning">Utkast</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatDate(post.publishedAt ?? post.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/nyheter/${post.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Redigera
                      </Link>
                      <form action={deleteNewsAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <button
                          type="submit"
                          className="font-medium text-red-600 hover:underline"
                        >
                          Ta bort
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
