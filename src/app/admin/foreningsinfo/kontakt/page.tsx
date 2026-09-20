import { getAssociationProfile } from "@/lib/data";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export default async function AdminAssociationProfilePage() {
  const profile = await getAssociationProfile();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Namn och kontakt"
        description="Föreningens namn, adress och kontaktuppgifter. De visas i sidhuvudet och sidfoten på alla sidor. Tomma fält visas inte."
      />
      <Card>
        <CardBody>
          <ProfileForm profile={profile} />
        </CardBody>
      </Card>
    </div>
  );
}
