import Link from "next/link";
import {
  getAllNotices,
  getBuildings,
  getDisplaySettings,
  listDisplays,
  type Notice,
} from "@/lib/data";
import { dateStrSe, lastDaySe } from "@/lib/board-dates";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  buttonClasses,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { NewDisplayForm, RegenerateTokenForm } from "./display-forms";
import { DisplaySettingsForm } from "./settings-form";
import { deleteNoticeAction, endNoticeAction, revokeDisplayAction } from "./actions";

type NoticeState = "aktivt" | "kommande" | "avslutat";

function stateOf(n: Notice, now: number): NoticeState {
  if (n.endsAt && new Date(n.endsAt).getTime() <= now) return "avslutat";
  if (new Date(n.startsAt).getTime() > now) return "kommande";
  return "aktivt";
}

const TONE = { aktivt: "success", kommande: "warning", avslutat: "neutral" } as const;

export default async function AdminBoardsPage() {
  const [displays, notices, buildings, settings] = await Promise.all([
    listDisplays(),
    getAllNotices(),
    getBuildings(),
    getDisplaySettings(),
  ]);
  // eslint-disable-next-line react-hooks/purity -- serverkomponent, renderas per förfrågan
  const now = Date.now();

  return (
    <div className="space-y-10">
      <PageHeader
        title="Trapphustavlor"
        description="Anslag som visas på skärmarna i trapphusen. Skärmarna hämtar nytt innehåll varje minut och visar det senaste de fått även om nätet ligger nere."
        actions={
          <Link href="/admin/tavlor/anslag/ny" className={buttonClasses("primary", "sm")}>
            Nytt anslag
          </Link>
        }
      />

      {/* Anslag */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Anslag</h2>
        {notices.length === 0 ? (
          <EmptyState title="Inga anslag ännu" />
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Rubrik</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Var</th>
                  <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {notices.map((n) => {
                  const state = stateOf(n, now);
                  return (
                    <tr key={n.id}>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {n.pinned ? <span className="mr-2 text-brand-700">●</span> : null}
                        {n.title}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={TONE[state]}>{state[0].toUpperCase() + state.slice(1)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDate(dateStrSe(new Date(n.startsAt)))} –{" "}
                        {n.endsAt ? formatDate(lastDaySe(new Date(n.endsAt))) : "tills vidare"}
                      </td>
                      <td className="px-4 py-3 text-muted">{n.buildingName ?? "Alla"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/admin/tavlor/anslag/${n.id}`}
                            className="font-medium text-brand-700 hover:underline"
                          >
                            Redigera
                          </Link>
                          {state !== "avslutat" ? (
                            <form action={endNoticeAction}>
                              <input type="hidden" name="id" value={n.id} />
                              <button type="submit" className="font-medium text-brand-700 hover:underline">
                                Ta ner
                              </button>
                            </form>
                          ) : null}
                          <form action={deleteNoticeAction}>
                            <input type="hidden" name="id" value={n.id} />
                            <button type="submit" className="font-medium text-red-600 hover:underline">
                              Ta bort
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Skärmar */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Skärmar</h2>
          <Link
            href="/tavla/forhandsvisning"
            target="_blank"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Förhandsgranska tavlan ↗
          </Link>
        </div>
        {displays.length === 0 ? (
          <EmptyState
            title="Inga skärmar ännu"
            description="Lägg till en skärm nedan för att få adressen som skärmen ska visa."
          />
        ) : (
          <div className="overflow-x-auto rounded-card border border-border bg-surface">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Skärm</th>
                  <th className="px-4 py-3 font-medium">Hus</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Åtgärd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border align-top">
                {displays.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                    <td className="px-4 py-3 text-muted">{d.buildingName ?? "–"}</td>
                    <td className="px-4 py-3">
                      {d.online ? (
                        <Badge tone="success">Igång</Badge>
                      ) : d.lastSeenAt ? (
                        <span className="text-muted">
                          <Badge tone="danger">Inte kontakt</Badge>
                          <span className="ml-2 text-xs">sedan {formatDateTime(d.lastSeenAt)}</span>
                        </span>
                      ) : (
                        <Badge tone="neutral">Inte startad</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          href={`/tavla/forhandsvisning${d.buildingId ? `?hus=${d.buildingId}` : ""}`}
                          target="_blank"
                          className="font-medium text-brand-700 hover:underline"
                        >
                          Förhandsgranska
                        </Link>
                        <RegenerateTokenForm id={d.id} name={d.name} />
                        <form action={revokeDisplayAction}>
                          <input type="hidden" name="id" value={d.id} />
                          <button type="submit" className="font-medium text-red-600 hover:underline">
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

        <Card>
          <CardBody className="space-y-4">
            <CardTitle>Lägg till skärm</CardTitle>
            <NewDisplayForm buildings={buildings} />
          </CardBody>
        </Card>
      </section>

      {/* Inställningar */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Inställningar</h2>
        <Card>
          <CardBody>
            <DisplaySettingsForm settings={settings} />
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
