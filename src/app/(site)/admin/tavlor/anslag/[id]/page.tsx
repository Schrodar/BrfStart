import { notFound } from "next/navigation";
import { getBuildings, getNoticeById } from "@/lib/data";
import { dateStrSe, lastDaySe } from "@/lib/board-dates";
import { PageHeader } from "@/components/ui";
import { NoticeForm } from "../../notice-form";
import { updateNoticeAction } from "../../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNoticePage({ params }: Props) {
  const { id } = await params;
  const [notice, buildings] = await Promise.all([getNoticeById(id), getBuildings()]);
  if (!notice) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Redigera anslag" />
      <NoticeForm
        action={updateNoticeAction}
        buildings={buildings}
        today={dateStrSe(new Date())}
        defaults={{
          id: notice.id,
          title: notice.title,
          body: notice.body,
          imageUrl: notice.imageUrl,
          startDate: dateStrSe(new Date(notice.startsAt)),
          endDate: notice.endsAt ? lastDaySe(new Date(notice.endsAt)) : "",
          buildingId: notice.buildingId,
          pinned: notice.pinned,
        }}
      />
    </div>
  );
}
