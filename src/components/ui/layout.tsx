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

/** Vertikal sektion med luft. */
export function Section({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section className={cn("py-10 sm:py-14", className)} {...props} />;
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
