import Image from "next/image";
import Link from "next/link";
import type { Apartment } from "@/lib/types";

/** Annonskort i samma uttryck som nyhetskorten: bild överst, serifrubrik. */
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
    <Link
      href={`/till-salu/${listing.id}`}
      className="card-lift group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface shadow-[var(--card-shadow)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand/60">
        {cover ? (
          <Image
            src={cover.url}
            alt={`Lägenhet ${listing.number}`}
            fill
            className="card-lift-image object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-bone to-sand text-sm text-muted">
            Foto saknas
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col px-6 py-6">
        <p className="title-card transition-colors duration-300 group-hover:text-moss">
          Lägenhet {listing.number}
        </p>
        {facts ? <p className="mt-2 text-sm text-muted">{facts}</p> : null}
        {listing.price ? (
          <p className="mt-auto pt-5 text-sm text-muted">
            Utropspris{" "}
            <span className="font-display text-lg text-moss">{listing.price}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
