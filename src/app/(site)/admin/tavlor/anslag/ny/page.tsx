import { getBuildings } from "@/lib/data";
import { dateStrSe } from "@/lib/board-dates";
import { PageHeader } from "@/components/ui";
import { NoticeForm } from "../../notice-form";
import { createNoticeAction } from "../../actions";

export default async function NewNoticePage() {
  const buildings = await getBuildings();
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Nytt anslag" />
      <NoticeForm action={createNoticeAction} buildings={buildings} today={dateStrSe(new Date())} />
    </div>
  );
}
