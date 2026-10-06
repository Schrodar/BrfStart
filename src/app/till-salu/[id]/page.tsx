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

// Inga annonser byggs i förväg. Var och en renderas vid första besöket och
// cachas sedan; admin och Sälja bygger om dem när en annons ändras.
export async function generateStaticParams() {
  return [];
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
    <div className="flex justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
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
          className="group inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-moss"
        >
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-1">←</span>
          Alla lägenheter till salu
        </Link>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <h1 className="title-page">
            Lägenhet {listing.number}
          </h1>
          {listing.price ? (
            <div className="sm:text-right">
              <p className="eyebrow">
                Utropspris
              </p>
              <p className="mt-2 font-display text-3xl font-light text-moss">{listing.price}</p>
            </div>
          ) : null}
        </div>
        {/* Priset skrivs in för hand och följer inte budgivningen. */}
        {listing.price ? (
          <p className="mt-2 text-xs text-muted sm:text-right">
            Priset uppdateras inte under budgivningen – aktuellt bud får du av
            mäklaren.
          </p>
        ) : null}

        {/* Galleri */}
        <div className="mt-10 space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-card bg-sand/60">
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
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {rest.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-card bg-sand/60"
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

        <div className="mt-14 grid gap-12 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {listing.saleDescription ? (
              <div>
                <h2 className="title-section">Om lägenheten</h2>
                <Prose className="prose-editorial mt-5" content={listing.saleDescription} />
              </div>
            ) : null}

            {listing.floorPlanUrl ? (
              <a
                href={listing.floorPlanUrl}
                target="_blank"
                rel="noopener"
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium text-moss shadow-[var(--card-shadow)] transition-colors duration-200 hover:bg-sand/30"
              >
                Visa planritning <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </a>
            ) : null}
          </div>

          <aside className="space-y-6">
            <Card>
              <CardBody>
                <h2 className="eyebrow">
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
                  <h2 className="eyebrow">
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
                  <h2 className="eyebrow">
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
                          className="link-inline"
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
                      className="link-more mt-4"
                    >
                      Se annonsen på Hemnet <span aria-hidden="true" className="arrow">→</span>
                    </a>
                  ) : null}
                </CardBody>
              </Card>
            ) : null}

            <p className="text-xs text-muted">
              Frågor om föreningen? Se{" "}
              <Link href="/for-maklare" className="link-inline">
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
