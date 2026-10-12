import {
  getMaintenanceCategoriesWithCounts,
  getMaintenanceRequests,
  getMaintenanceSettings,
} from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { AdminSection } from "./admin-section";
import { CategoryManager } from "./category-manager";
import { RequestList } from "./request-list";
import { SettingsForm } from "./settings-form";

export default async function AdminMaintenancePage() {
  const [requests, categories, settings] = await Promise.all([
    getMaintenanceRequests(),
    getMaintenanceCategoriesWithCounts(),
    getMaintenanceSettings(),
  ]);

  const open = requests.filter((r) => r.status !== "atgardad").length;
  const hidden = [
    settings.emergencyPhone ? null : "jourrutan",
    settings.caretakerPhone ? null : "fastighetsskötaren",
  ].filter(Boolean);
  const missingContractor = categories.filter(
    (c) => !c.contractorName && !c.contractorPhone,
  ).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Felanmälningar"
        description="Ärendena du hanterar, och inställningarna som styr hur felanmälningssidan ser ut för de boende."
      />

      {/* Ärendena är sidans syfte och ligger därför öppen; inställningarna
          fälls ut vid behov så att listan inte drunknar i formulär. */}
      <AdminSection
        title="Inkomna ärenden"
        description="Öppna ett ärende för att sätta status, tilldela det och skriva noteringar. Varje sparning hamnar i ärendets historik."
        badge={
          requests.length === 0
            ? undefined
            : `${open} öppna av ${requests.length}`
        }
        defaultOpen
      >
        <RequestList requests={requests} categories={categories} />
      </AdminSection>

      <AdminSection
        title="Texter på felanmälningssidan"
        description={
          hidden.length > 0
            ? `Förklaring, jour och fastighetsskötare. Jouren och fastighetsskötaren visas även på Kontakt. Just nu döljs ${hidden.join(" och ")} för besökaren.`
            : "Förklaringen om vad föreningen ansvarar för, jourtelefon och fastighetsskötare. De två sista visas även på Kontakt."
        }
      >
        <SettingsForm settings={settings} />
      </AdminSection>

      <AdminSection
        title="Kategorier och underleverantörer"
        description={
          missingContractor > 0
            ? `Valen i formulärets rullgardin. ${missingContractor} av ${categories.length} kategorier saknar underleverantör.`
            : "Valen i formulärets rullgardin, och vem som normalt utför jobbet i varje kategori."
        }
        badge={`${categories.length} st`}
      >
        <CategoryManager categories={categories} />
      </AdminSection>
    </div>
  );
}
