import { getMembers } from "@/lib/data";
import type { Member } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import {
  approveMemberAction,
  deleteMemberAction,
  rejectMemberAction,
  setListingPermissionAction,
  setRoleAction,
} from "./actions";

function MemberRow({ member }: { member: Member }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium text-foreground">{member.fullName}</p>
        <p className="text-xs text-muted">{member.email}</p>
      </td>
      <td className="px-4 py-3 text-muted">{member.apartment || "–"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {member.role === "admin" ? (
            <Badge tone="brand">Styrelse</Badge>
          ) : (
            <Badge>Boende</Badge>
          )}
          {member.canManageListing ? (
            <Badge tone="success">Annonsrätt</Badge>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-muted">{formatDate(member.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {member.status === "pending" ? (
            <>
              <form action={approveMemberAction}>
                <input type="hidden" name="id" value={member.id} />
                <button className="font-medium text-brand-700 hover:underline">
                  Godkänn
                </button>
              </form>
              <form action={rejectMemberAction}>
                <input type="hidden" name="id" value={member.id} />
                <button className="font-medium text-red-600 hover:underline">
                  Neka
                </button>
              </form>
            </>
          ) : (
            <>
              <form action={setRoleAction} className="flex items-center gap-1">
                <input type="hidden" name="id" value={member.id} />
                <select
                  name="role"
                  defaultValue={member.role}
                  className="rounded-md border border-border bg-white px-2 py-1 text-xs"
                >
                  <option value="member">Boende</option>
                  <option value="admin">Styrelse</option>
                </select>
                <button className="text-xs font-medium text-brand-700 hover:underline">
                  Spara
                </button>
              </form>
              <form action={setListingPermissionAction}>
                <input type="hidden" name="id" value={member.id} />
                <input
                  type="hidden"
                  name="value"
                  value={member.canManageListing ? "0" : "1"}
                />
                <button className="font-medium text-brand-700 hover:underline">
                  {member.canManageListing ? "Ta bort annonsrätt" : "Ge annonsrätt"}
                </button>
              </form>
              <form action={deleteMemberAction}>
                <input type="hidden" name="id" value={member.id} />
                <button className="font-medium text-red-600 hover:underline">
                  Ta bort
                </button>
              </form>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export default async function AdminMembersPage() {
  const members = await getMembers();
  const pending = members.filter((m) => m.status === "pending");
  const others = members.filter((m) => m.status !== "pending");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Medlemmar"
        description="Godkänn nya registreringar och hantera behörigheter."
      />

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Väntar på godkännande ({pending.length})
        </h2>
        <div className="mt-3">
          {pending.length === 0 ? (
            <Card>
              <CardBody className="py-6 text-sm text-muted">
                Inga nya registreringar just nu.
              </CardBody>
            </Card>
          ) : (
            <MemberTable members={pending} />
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Alla konton
        </h2>
        <div className="mt-3">
          {others.length === 0 ? (
            <EmptyState title="Inga aktiva konton" />
          ) : (
            <MemberTable members={others} />
          )}
        </div>
      </div>
    </div>
  );
}

function MemberTable({ members }: { members: Member[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Namn</th>
            <th className="px-4 py-3 font-medium">Lgh</th>
            <th className="px-4 py-3 font-medium">Roll</th>
            <th className="px-4 py-3 font-medium">Registrerad</th>
            <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
