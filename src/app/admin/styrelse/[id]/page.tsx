import { notFound } from "next/navigation";
import { getBoardGroups, getBoardMemberById } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { BoardForm } from "../board-form";
import { updateBoardMemberAction } from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBoardMemberPage({ params }: Props) {
  const { id } = await params;
  const [member, groups] = await Promise.all([
    getBoardMemberById(id),
    getBoardGroups(),
  ]);
  if (!member) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Redigera person" />
      <BoardForm
        action={updateBoardMemberAction}
        groups={groups}
        defaults={member}
      />
    </div>
  );
}
