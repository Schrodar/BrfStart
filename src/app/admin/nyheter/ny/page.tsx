import { PageHeader } from "@/components/ui";
import { NewsForm } from "../news-form";
import { createNewsAction } from "../actions";

export default function NewNewsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Ny nyhet" />
      <NewsForm action={createNewsAction} />
    </div>
  );
}
