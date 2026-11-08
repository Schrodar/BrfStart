import Form from "next/form";
import Link from "next/link";
import { getSupportSession, requireAdmin } from "@/lib/auth";
import {
  getAdminAccounts,
  getAssociationProfile,
  searchApartments,
  type AdminAccount,
  type ApartmentHit,
} from "@/lib/data";
import { formatApartmentNumber } from "@/lib/numbering";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardBody,
  EmptyState,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";
import { newCodeAction } from "../lagenheter/actions";
import { CodeLettersButton, type LetterSender } from "../lagenheter/code-letters";
import { grantAdminAction, revokeAdminAction } from "./actions";
import { ConfirmSubmit } from "./confirm-submit";

interface Props {
  searchParams: Promise<{ lgh?: string | string[] }>;
}

const REMOVE_CLASSES =
  "text-sm font-medium text-red-600 hover:underline disabled:opacity-60";

/**
 * Konton – för styrelsens admins och för JnM i supportläget. Överst styrelsens
 * admins. Under dem en sökning på lägenhetsnummer i alla hus, där lägenhetens
 * konto får admin-rätt när någon där sitter i styrelsen. En lista med alla
 * lägenheter skulle bli för lång att välja i.
 *
 * Koderna och lägenhetsregistret sköts bara av JnM: i supportläget har varje
 * träff också Skapa kod / Ny kod och en länk till lägenhetens sida.
 */
export default async function AccountsPage({ searchParams }: Props) {
  const user = await requireAdmin();
  const support = Boolean(await getSupportSession());
  const raw = (await searchParams).lgh;
  const query = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  const [admins, hits, profile] = await Promise.all([
    getAdminAccounts(),
    query ? searchApartments(query) : Promise.resolve<ApartmentHit[]>([]),
    getAssociationProfile(),
  ]);
  const sender: LetterSender = {
    name: profile.name,
    contactEmail: profile.contactEmail,
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Konton"
        description={
          support
            ? "Styrelsens admins och lägenheternas koder. En ledamot använder sin lägenhets konto, som får admin-rätt här."
            : "Styrelsens admins. En ledamot använder sin lägenhets konto, som får admin-rätt här. Koder och nya brev sköts av JnM."
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Styrelsens admins ({admins.length})
        </h2>
        {admins.length === 0 ? (
          <EmptyState
            title="Inga admins ännu"
            description="Sök fram ledamotens lägenhet nedan och ge lägenhetens konto admin-rätt."
          />
        ) : (
          <AdminTable admins={admins} currentUserId={user.id} />
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Sök lägenhet</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            {support
              ? "Ge en lägenhet en ny kod, eller ge lägenhetens konto admin-rätt när någon där sitter i styrelsen."
              : "Ge lägenhetens konto admin-rätt när någon där sitter i styrelsen."}{" "}
            Sökningen gäller alla hus och tar också Lantmäteriets nummer.
          </p>
        </div>

        <Form action="/admin/medlemmar" className="flex max-w-md items-end gap-2">
          <Field label="Lägenhetsnummer" htmlFor="lgh-search" className="flex-1">
            <Input
              id="lgh-search"
              name="lgh"
              defaultValue={query}
              placeholder="t.ex. 31"
              autoComplete="off"
            />
          </Field>
          <Button type="submit">Sök</Button>
        </Form>

        {!query ? null : hits.length === 0 ? (
          <EmptyState
            title={`Ingen lägenhet ${query}`}
            description={
              support
                ? "Kontrollera numret. Lägenheter läggs upp under Hus och lägenheter."
                : "Kontrollera numret. Lägenheterna läggs upp av JnM."
            }
          />
        ) : (
          <ul className="space-y-4">
            {hits.map((hit) => (
              <li key={hit.id}>
                <HitCard
                  hit={hit}
                  sender={sender}
                  support={support}
                  currentUserId={user.id}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AdminTable({
  admins,
  currentUserId,
}: {
  admins: AdminAccount[];
  currentUserId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-border text-left text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Admin</th>
            <th className="px-4 py-3 font-medium">Konto</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {admins.map((admin) => (
            <tr key={admin.memberId}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{admin.name}</p>
                <p className="text-xs text-muted">
                  {admin.kind === "apartment"
                    ? admin.apartment?.buildingName || "Inte placerad i något hus"
                    : admin.email}
                </p>
              </td>
              <td className="px-4 py-3 text-muted">
                {admin.kind === "apartment" ? "Lägenhetens konto" : "Personligt konto"}
              </td>
              <td className="px-4 py-3">
                {!admin.hasLogin ? (
                  <Badge tone="warning">Saknar inloggning</Badge>
                ) : !admin.approved ? (
                  <Badge tone="warning">Inte godkänd</Badge>
                ) : (
                  <Badge tone="success">Aktiv</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {admin.memberId === currentUserId ? (
                  // Ingen tar bort sin egen admin-rätt – se revokeAdminAction.
                  <span className="text-sm text-muted">Ditt konto</span>
                ) : (
                  <ConfirmSubmit
                    action={revokeAdminAction}
                    fields={{ memberId: admin.memberId }}
                    question={
                      admin.kind === "apartment"
                        ? `Vill du ta bort admin-rätten för ${admin.name}?\n\nKontot finns kvar som lägenhetens vanliga konto.`
                        : `Vill du ta bort admin-kontot för ${admin.name}?\n\nKontot tas bort ur föreningen och kommer inte längre åt adminpanelen.`
                    }
                    className={REMOVE_CLASSES}
                  >
                    {admin.kind === "apartment" ? "Ta bort admin-rätten" : "Ta bort"}
                  </ConfirmSubmit>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function stateText(hit: ApartmentHit, support: boolean): string {
  switch (hit.state) {
    case "ingen-kod":
      return support
        ? "Ingen kod ännu. Kontot skapas när koden används."
        : "Ingen kod ännu. JnM skapar koden, och kontot skapas när den används.";
    case "kod-skapad":
      return `Kod skapad ${formatDate(hit.codeCreatedAt!)}. Ingen har använt den ännu – kontot kan bli admin först när det finns.`;
    case "aktiverat":
      return `Kontot aktiverades ${formatDate(hit.activatedAt!)}.`;
    case "admin":
      return `Kontot aktiverades ${formatDate(hit.activatedAt!)} och har admin-rätt.`;
    case "personligt":
      return support
        ? "Ett gammalt personligt konto från tiden med registrering. Det kan inte bli admin – lägenheten behöver använda en kod först."
        : "Ett gammalt personligt konto från tiden med registrering. Det kan inte bli admin – lägenheten behöver en kod från JnM först.";
  }
}

/** En träff: lägenheten, kontots läge och admin-rätten – i supportläget även koden. */
function HitCard({
  hit,
  sender,
  support,
  currentUserId,
}: {
  hit: ApartmentHit;
  sender: LetterSender;
  support: boolean;
  currentUserId: string;
}) {
  const where =
    [hit.buildingName, hit.buildingAddress].filter(Boolean).join(", ") ||
    "Inte placerad i något hus";
  const ownAccount = hit.memberId !== null && hit.memberId === currentUserId;

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">
              Lägenhet {formatApartmentNumber(hit.number, hit.standardNumber)}
              {hit.state === "admin" ? (
                <Badge tone="brand" className="ml-2">
                  Admin
                </Badge>
              ) : null}
            </p>
            <p className="text-sm text-muted">{where}</p>
          </div>
          {support ? (
            <Link
              href={`/admin/lagenheter/${hit.id}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Öppna lägenheten →
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm">{stateText(hit, support)}</p>
          {hit.state === "aktiverat" ? (
            <ConfirmSubmit
              action={grantAdminAction}
              fields={{ apartmentId: hit.id }}
              question={`Vill du ge Lägenhet ${hit.number} admin-rätt?\n\nAlla som loggar in med lägenhetens konto kommer åt adminpanelen.`}
              className={buttonClasses("secondary", "sm")}
            >
              Gör till admin
            </ConfirmSubmit>
          ) : hit.state === "admin" && hit.memberId && !ownAccount ? (
            <ConfirmSubmit
              action={revokeAdminAction}
              fields={{ memberId: hit.memberId }}
              question={`Vill du ta bort admin-rätten för Lägenhet ${hit.number}?\n\nKontot finns kvar som lägenhetens vanliga konto.`}
              className={REMOVE_CLASSES}
            >
              Ta bort admin-rätten
            </ConfirmSubmit>
          ) : ownAccount ? (
            <span className="text-sm text-muted">Ditt konto</span>
          ) : null}
        </div>

        {support ? (
          <div className="border-t border-border pt-4">
            <CodeLettersButton
              action={newCodeAction}
              fields={{ apartmentId: hit.id }}
              label={hit.hasCode ? "Ny kod" : "Skapa kod"}
              pendingText="Skapar kod…"
              variant="secondary"
              sender={sender}
            />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
