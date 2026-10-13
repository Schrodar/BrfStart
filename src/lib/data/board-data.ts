import { BOARD_BUILD, type BoardContact, type BoardData } from "@/lib/board";
import { getAssociationProfile } from "./association";
import { getDisplaySettings } from "./displays";
import { getMaintenanceSettings } from "./maintenance";
import { getPublishedNews } from "./news";
import { getNoticesForBuilding } from "./notices";

/**
 * Allt en trapphustavla visar, för ett visst hus (null = föreningen i stort).
 * Används av /api/tavla och av förhandsvisningen i adminpanelen.
 */
export async function getBoardData(
  building: { id: string; name: string; address: string } | null,
): Promise<BoardData> {
  const [association, settings, maintenance, notices, news] = await Promise.all([
    getAssociationProfile(),
    getDisplaySettings(),
    getMaintenanceSettings(),
    getNoticesForBuilding(building?.id ?? null),
    getPublishedNews(),
  ]);

  const contacts: BoardContact[] = [];
  if (maintenance.emergencyPhone) {
    contacts.push({
      label: "Akuta fel",
      name: "",
      phone: maintenance.emergencyPhone,
      note: maintenance.emergencyText,
    });
  }
  if (maintenance.caretakerPhone) {
    contacts.push({
      label: "Fastighetsskötare",
      name: maintenance.caretakerName,
      phone: maintenance.caretakerPhone,
      note: "",
    });
  }
  if (association.propertyManagerPhone || association.propertyManagerEmail) {
    contacts.push({
      label: "Förvaltare",
      name: association.propertyManagerName,
      phone: association.propertyManagerPhone || association.propertyManagerEmail,
      note: "",
    });
  }
  if (association.contactPhone || association.contactEmail) {
    contacts.push({
      label: "Styrelsen",
      name: "",
      phone: association.contactPhone || association.contactEmail,
      note: "",
    });
  }

  return {
    build: BOARD_BUILD,
    generatedAt: new Date().toISOString(),
    association: {
      name: association.name,
      street: association.street,
      city: association.city,
    },
    building: building ? { name: building.name, address: building.address } : null,
    notices: notices.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      imageUrl: n.imageUrl,
      startsAt: n.startsAt,
      endsAt: n.endsAt,
      pinned: n.pinned,
    })),
    news: settings.showNews
      ? news.slice(0, 2).map((n) => ({
          id: n.id,
          title: n.title,
          excerpt: n.excerpt,
          publishedAt: n.publishedAt,
        }))
      : [],
    contacts,
    night: { start: settings.nightStart, end: settings.nightEnd },
  };
}
