import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centrerad innehållsbredd. */
export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mx-auto w-full max-w-5xl px-4 sm:px-6", className)}
      {...props}
    />
  );
}

/** Vertikal sektion med luft. Används bara av de publika sidorna. */
export function Section({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={cn("py-14 sm:py-20", className)} {...props} />;
}

/**
 * Sidans rubrikblock på den publika sajten: ögonbrynsrad, stor serifrubrik,
 * ingress och en tunn linje under. (Admin använder PageHeader.)
 */
export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-border pb-10 sm:pb-14", className)}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className={cn("title-page", eyebrow && "mt-4")}>{title}</h1>
          {description ? (
            <div className="lead mt-5 max-w-2xl">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Sektionsrubrik på den publika sajten, med en valfri "Visa alla"-länk. */
export function SectionHeading({
  eyebrow,
  title,
  href,
  linkLabel,
  className,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className={cn("title-section", eyebrow && "mt-3")}>{title}</h2>
      </div>
      {href && linkLabel ? (
        <Link href={href} className="link-more">
          {linkLabel} <span aria-hidden="true" className="arrow">→</span>
        </Link>
      ) : null}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** T.ex. en knapp till höger. */
  actions?: ReactNode;
  className?: string;
}

/** Rubrikblock högst upp på en sida. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
