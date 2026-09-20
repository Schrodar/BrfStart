import Image from "next/image";
import Link from "next/link";
import type { Apartment } from "@/lib/types";
import { Card, CardBody } from "@/components/ui";

export function ListingCard({ listing }: { listing: Apartment }) {
  const cover = listing.photos[0];
  const facts = [
    listing.rooms,
    listing.sizeSqm && `${listing.sizeSqm} m²`,
    listing.floor && `vån ${listing.floor}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link href={`/till-salu/${listing.id}`} className="group block">
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <div className="relative aspect-[4/3] bg-black/5">
          {cover ? (
            <Image
              src={cover.url}
              alt={`Lägenhet ${listing.number}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Foto saknas
            </div>
          )}
        </div>
        <CardBody>
          <p className="font-semibold text-foreground group-hover:text-brand-700">
            Lägenhet {listing.number}
          </p>
          {facts ? <p className="mt-1 text-sm text-muted">{facts}</p> : null}
          {listing.price ? (
            <p className="mt-2 text-sm text-muted">
              Utropspris{" "}
              <span className="font-semibold text-brand-700">
                {listing.price}
              </span>
            </p>
          ) : null}
        </CardBody>
      </Card>
    </Link>
  );
}
