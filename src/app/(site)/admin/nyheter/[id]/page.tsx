import { notFound } from "next/navigation";
import { getNewsById } from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { NewsForm } from "../news-form";
import { updateNewsAction } from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params;
  const post = await getNewsById(id);
  if (!post) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Redigera nyhet" />
      <NewsForm action={updateNewsAction} defaults={post} />
    </div>
  );
}
