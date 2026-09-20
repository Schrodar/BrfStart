import { getSiteContent } from "@/lib/data";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { ContentForm } from "./content-form";

export default async function AdminContentPage() {
  const content = await getSiteContent();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Sidinnehåll"
        description="Redigera texterna på startsidan och Om föreningen."
      />
      <Card>
        <CardBody>
          <ContentForm content={content} />
        </CardBody>
      </Card>
    </div>
  );
}
