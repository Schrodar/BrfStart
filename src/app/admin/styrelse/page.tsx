import Link from "next/link";
import { getBoardGrouped } from "@/lib/data";
import type { BoardGroupWithMembers } from "@/lib/types";
import { buttonClasses, EmptyState, PageHeader } from "@/components/ui";
import { deleteBoardMemberAction } from "./actions";
import { GroupManager } from "./group-manager";

function GroupTable({ group }: { group: BoardGroupWithMembers }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
        {group.name}
      </h3>
      <div className="mt-3">
        {group.members.length === 0 ? (
          <EmptyState title="Inga personer tillagda" />
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Roll</th>
                  <th className="px-4 py-3 font-medium">Namn</th>
                  <th className="px-4 py-3 font-medium">E-post</th>
                  <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.members.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {m.role}
                    </td>
                    <td className="px-4 py-3">{m.name}</td>
                    <td className="px-4 py-3 text-muted">{m.email || "–"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/styrelse/${m.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          Redigera
                        </Link>
                        <form action={deleteBoardMemberAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className="font-medium text-red-600 hover:underline">
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
    </div>
  );
}

export default async function AdminBoardPage() {
  const groups = await getBoardGrouped();

  return (
    <div className="space-y-10">
      <PageHeader
        title="Styrelse och grupper"
        description="Föreningen skapar sina egna grupper – styrelse, valberedning, arbetsgrupper."
        actions={
          groups.length > 0 ? (
            <Link
              href="/admin/styrelse/ny"
              className={buttonClasses("primary", "sm")}
            >
              Ny person
            </Link>
          ) : null
        }
      />

      {groups.length === 0 ? (
        <EmptyState title="Inga grupper ännu" />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <GroupTable key={g.id} group={g} />
          ))}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Grupper</h2>
        <GroupManager groups={groups} />
      </section>
    </div>
  );
}
