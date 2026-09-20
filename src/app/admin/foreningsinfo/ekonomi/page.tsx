import Link from "next/link";
import { getEconomyFigures } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui";
import { KeyFiguresForm } from "./key-figures-form";

export default async function AdminEconomyPage() {
  const figures = await getEconomyFigures();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Ekonomi"
        description={
          <>
            Räkna ut föreningens nyckeltal med siffrorna från årsredovisningen.
            Det du sparar visas på sidan{" "}
            <Link href="/ekonomi" className="text-brand-700 hover:underline">
              Föreningens ekonomi
            </Link>
            .
          </>
        }
      />
      <KeyFiguresForm
        initial={figures}
        savedAtLabel={figures.updatedAt ? formatDateTime(figures.updatedAt) : null}
      />
    </div>
  );
}
