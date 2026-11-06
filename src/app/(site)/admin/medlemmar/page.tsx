import { requireSupport } from "@/lib/auth";
import { getAssociationProfile, getMembers, listInvitations } from "@/lib/data";
import type { InvitationItem } from "@/lib/data/invitations";
import type { Member } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { Badge, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { removeAdminAction, revokeInvitationAction } from "./actions";
import { InviteForm } from "./invite-form";

/**
 * Styrelsens personliga konton – bara i supportläget. De boende har
 * lägenhetens konto och syns under Hus och lägenheter.
 */
export default async function AdminAccountsPage() {
  await requireSupport();
  const [members, invitations, profile] = await Promise.all([
    getMembers(),
    listInvitations(),
    getAssociationProfile(),
  ]);
  const admins = members.filter((m) => m.role === "admin");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admins"
        description="Ledamöternas personliga konton till adminpanelen. Bara du ser sidan, i supportläget. De boende har lägenhetens konto, som sköts under Hus och lägenheter."
      />

      <Card>
        <CardBody>
          <h2 className="mb-4 font-semibold">Bjud in en ledamot</h2>
          <InviteForm associationName={profile.name} />
        </CardBody>
      </Card>

      {invitations.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Inbjudningar
          </h2>
          <div className="mt-3">
            <InvitationTable invitations={invitations} />
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Admins ({admins.length})
        </h2>
        <div className="mt-3">
          {admins.length === 0 ? (
            <EmptyState title="Inga admins ännu" />
          ) : (
            <AdminTable admins={admins} />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminTable({ admins }: { admins: Member[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-border text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Namn</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Sedan</th>
            <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{admin.fullName}</p>
                <p className="text-xs text-muted">{admin.email}</p>
              </td>
              <td className="px-4 py-3">
                {admin.status === "approved" ? (
                  <Badge tone="success">Aktiv</Badge>
                ) : (
                  <Badge tone="warning">Inte godkänd</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-muted">{formatDate(admin.createdAt)}</td>
              <td className="px-4 py-3 text-right">
                <form action={removeAdminAction}>
                  <input type="hidden" name="id" value={admin.id} />
                  <button className="text-sm font-medium text-red-600 hover:underline">
                    Ta bort
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const INVITATION_TONE = {
  väntar: "warning",
  aktiverad: "success",
  utgången: "neutral",
  återkallad: "neutral",
} as const;

function InvitationTable({ invitations }: { invitations: InvitationItem[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Namn</th>
            <th className="px-4 py-3 font-medium">Roll</th>
            <th className="px-4 py-3 font-medium">Inbjuden av</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invitations.map((inv) => (
            <tr key={inv.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{inv.fullName}</p>
                <p className="text-xs text-muted">{inv.email}</p>
              </td>
              <td className="px-4 py-3 text-muted">
                {inv.role === "admin" ? "Admin" : "Boende"}
              </td>
              <td className="px-4 py-3 text-muted">
                {inv.invitedBy || "–"}
                <span className="block text-xs">{formatDate(inv.createdAt)}</span>
              </td>
              <td className="px-4 py-3">
                <Badge tone={INVITATION_TONE[inv.state]}>{inv.state}</Badge>
                <span className="mt-1 block text-xs text-muted">
                  {inv.state === "väntar"
                    ? `till ${formatDate(inv.expiresAt)}${inv.emailedAt ? " · mejlad" : ""}`
                    : inv.state === "aktiverad" && inv.usedAt
                      ? formatDate(inv.usedAt)
                      : ""}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {inv.state === "väntar" ? (
                  <form action={revokeInvitationAction}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button className="text-sm font-medium text-red-600 hover:underline">
                      Återkalla
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
