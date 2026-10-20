import {
  getMaintenanceCategoriesWithCounts,
  getMaintenanceRequests,
} from "@/lib/data";
import { PageHeader } from "@/components/ui";
import { MeetingBoard } from "./meeting-board";

/**
 * Mötesläget: månadens felanmälningar efter varandra, så att styrelsen kan gå
 * igenom dem på mötet och hantera vart och ett direkt på raden. Vilka ärenden
 * som hör till månaden avgörs i webbläsaren (MeetingBoard), där månaden väljs.
 */
export default async function MaintenanceMeetingPage() {
  const [requests, categories] = await Promise.all([
    getMaintenanceRequests(),
    getMaintenanceCategoriesWithCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mötesläge"
        description="Månadens felanmälningar inför styrelsemötet – hantera dem på raden och kopiera sedan protokolltexten."
      />
      <MeetingBoard requests={requests} categories={categories} />
    </div>
  );
}
