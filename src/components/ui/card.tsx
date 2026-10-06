import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Yta för innehåll. Färg, kant och skugga kommer ur variabler – varma på den
 * publika sajten och neutrala i admin (se DESIGNSPRÅK i globals.css).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface border border-border rounded-card shadow-[var(--card-shadow)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}
