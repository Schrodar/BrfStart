import { renderBasicMarkdown } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Renderar enkel markdown (rubriker, listor, stycken) som säker HTML. */
export function Prose({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn("prose text-foreground", className)}
      dangerouslySetInnerHTML={{ __html: renderBasicMarkdown(content) }}
    />
  );
}
