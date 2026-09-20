import Image from "next/image";
import { siteConfig } from "@/config/siteConfig";

/** Föreningens logotyp – läser källan från siteConfig. */
export function AssociationLogo({
  size = 36,
  priority = false,
  light = false,
  alt = "Föreningens logotyp",
  className,
}: {
  size?: number;
  priority?: boolean;
  /** Använd den ljusa/inverterade logotypen (för mörka ytor). */
  light?: boolean;
  /** Override av alt-text. Ange "" för dekorativ logotyp bredvid namntext. */
  alt?: string;
  className?: string;
}) {
  const src =
    light && siteConfig.logo.lightSrc
      ? siteConfig.logo.lightSrc
      : siteConfig.logo.src;
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
