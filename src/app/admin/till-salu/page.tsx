import Link from "next/link";
import { getListings } from "@/lib/data";
import { Badge, buttonClasses, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function AdminListingsPage() {
  const listings = await getListings();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Till salu"
        description="Lägenheter som är ute till försäljning. Registret med alla lägenheter finns under Lägenheter."
        actions={
          <Link
            href="/admin/till-salu/ny"
            className={buttonClasses("primary", "sm")}
          >
            Ny annons
          </Link>
        }
      />

      {listings.length === 0 ? (
        <EmptyState title="Inga lägenheter till salu" />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Lägenhet</th>
                <th className="px-4 py-3 font-medium">Utropspris</th>
                <th className="px-4 py-3 font-medium">Foton</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listings.map((a) => {
                const published = a.listingStatus === "published";
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{a.number}</p>
                      <p className="text-xs text-muted">
                        {[a.rooms, a.sizeSqm && `${a.sizeSqm} m²`]
                          .filter(Boolean)
                          .join(" · ") || "–"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted">{a.price || "–"}</td>
                    <td className="px-4 py-3 text-muted">{a.photos.length}</td>
                    <td className="px-4 py-3">
                      {published ? (
                        <>
                          <Badge tone="success">Publicerad</Badge>
                          <p className="mt-1 text-xs text-muted">
                            {formatDate(a.publishedAt)}
                          </p>
                        </>
                      ) : (
                        <Badge tone="warning">Utkast</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/till-salu/${a.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Redigera annons
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
