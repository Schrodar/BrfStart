import Link from "next/link";
import { getBoardGroups } from "@/lib/data";
import { buttonClasses, EmptyState, PageHeader } from "@/components/ui";
import { BoardForm } from "../board-form";
import { createBoardMemberAction } from "../actions";

export default async function NewBoardMemberPage() {
  const groups = await getBoardGroups();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Ny person" />
      {groups.length === 0 ? (
        // Utan grupp finns ingenstans att lägga personen – peka dit istället
        // för att visa ett formulär som inte går att skicka.
        <div className="space-y-4">
          <EmptyState title="Skapa en grupp först" />
          <Link href="/admin/styrelse" className={buttonClasses("primary", "sm")}>
            Till grupper
          </Link>
        </div>
      ) : (
        <BoardForm action={createBoardMemberAction} groups={groups} />
      )}
    </div>
  );
}
