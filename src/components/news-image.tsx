import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Nyhetens bild, eller en lugn platshållare när bild saknas: varm sandton med
 * en tunn linjeteckning av ett hus. Bilden är dekorativ (alt="") – rubriken
 * står alltid bredvid. Inom ett .card-lift zoomar den sakta vid hover.
 */
export function NewsImage({
  src,
  sizes,
  priority = false,
  className,
}: {
  src: string | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-sand/60", className)}>
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="card-lift-image object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="card-lift-image absolute inset-0 flex items-center justify-center bg-gradient-to-br from-bone to-sand"
        >
          <svg
            viewBox="0 0 64 64"
            className="h-14 w-14 text-moss/30"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 30 32 12l22 18" />
            <path d="M16 26v26h32V26" />
            <path d="M27 52V38h10v14" />
            <path d="M21 32h6v5h-6zM37 32h6v5h-6z" />
          </svg>
        </div>
      )}
    </div>
  );
}
