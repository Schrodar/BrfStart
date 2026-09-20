import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssociationProfile, getListingById } from "@/lib/data";
import { shortNameOf } from "@/lib/utils";
import { Card, CardBody, Container, Section } from "@/components/ui";
import { Prose } from "@/components/prose";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Annonsen saknas" };
  return {
    title: `Lägenhet ${listing.number} till salu`,
    description: listing.saleDescription || undefined,
  };
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const [listing, association] = await Promise.all([
    getListingById(id),
    getAssociationProfile(),
  ]);
  if (!listing) notFound();

  const cover = listing.photos[0];
  const rest = listing.photos.slice(1);

  return (
    <Section>
      <Container className="max-w-4xl">
        <Link
          href="/till-salu"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ← Alla lägenheter till salu
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Lägenhet {listing.number}
          </h1>
          {listing.price ? (
            <div className="sm:text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Utropspris
              </p>
              <p className="text-2xl font-bold text-brand-700">{listing.price}</p>
            </div>
          ) : null}
        </div>
        {/* Priset skrivs in för hand och följer inte budgivningen. */}
        {listing.price ? (
          <p className="mt-1 text-xs text-muted sm:text-right">
            Priset uppdateras inte under budgivningen – aktuellt bud får du av
            mäklaren.
          </p>
        ) : null}

        {/* Galleri */}
        <div className="mt-6 space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-card bg-black/5">
            {cover ? (
              <Image
                src={cover.url}
                alt={`Lägenhet ${listing.number}`}
                fill
                className="object-cover"
                sizes="(max-width: 896px) 100vw, 896px"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Inga foton
              </div>
            )}
          </div>
          {rest.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {rest.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black/5"
                >
                  <Image
                    src={photo.url}
                    alt={photo.caption || `Lägenhet ${listing.number}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 33vw, 220px"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {listing.saleDescription ? (
              <div>
                <h2 className="text-lg font-semibold">Om lägenheten</h2>
                <Prose className="mt-2" content={listing.saleDescription} />
              </div>
            ) : null}

            {listing.floorPlanUrl ? (
              <a
                href={listing.floorPlanUrl}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Visa planritning →
              </a>
            ) : null}
          </div>

          <aside className="space-y-6">
            <Card>
              <CardBody>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Fakta
                </h2>
                <dl className="mt-3">
                  <Fact label="Antal rum" value={listing.rooms} />
                  <Fact
                    label="Boarea"
                    value={listing.sizeSqm ? `${listing.sizeSqm} m²` : ""}
                  />
                  <Fact label="Våning" value={listing.floor} />
                  <Fact label="Avgift" value={listing.monthlyFee} />
                </dl>
              </CardBody>
            </Card>

            {listing.viewingInfo ? (
              <Card>
                <CardBody>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    Visning
                  </h2>
                  <p className="mt-2 text-sm text-foreground">
                    {listing.viewingInfo}
                  </p>
                </CardBody>
              </Card>
            ) : null}

            {listing.brokerName ||
            listing.brokerPhone ||
            listing.brokerEmail ||
            listing.hemnetUrl ? (
              <Card>
                <CardBody>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    Mäklare
                  </h2>
                  <ul className="mt-2 space-y-1 text-sm">
                    {listing.brokerName ? (
                      <li className="font-medium text-foreground">
                        {listing.brokerName}
                      </li>
                    ) : null}
                    {listing.brokerPhone ? (
                      <li className="text-muted">{listing.brokerPhone}</li>
                    ) : null}
                    {listing.brokerEmail ? (
                      <li>
                        <a
                          href={`mailto:${listing.brokerEmail}`}
                          className="text-brand-700 hover:underline"
                        >
                          {listing.brokerEmail}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                  {listing.hemnetUrl ? (
                    <a
                      href={listing.hemnetUrl}
                      target="_blank"
                      rel="noopener"
                      className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
                    >
                      Se annonsen på Hemnet →
                    </a>
                  ) : null}
                </CardBody>
              </Card>
            ) : null}

            <p className="text-xs text-muted">
              Frågor om föreningen? Se{" "}
              <Link href="/for-maklare" className="text-brand-700 hover:underline">
                föreningsfakta för köpare
              </Link>{" "}
              eller kontakta {shortNameOf(association)}.
            </p>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
