import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus-visible:border-brand-500 focus-visible:outline-none";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Etikett + kontroll + ev. hjälptext. */
export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: ComponentPropsWithRef<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

/**
 * Textfält med enheten ("kr", "m²") fast i högerkanten, så att det aldrig är
 * oklart vad siffran avser. Enheten är dold för skärmläsare – lägg den i
 * etiketten i stället (t.ex. som sr-only-text).
 */
export function UnitInput({
  unit,
  invalid,
  className,
  ...props
}: ComponentPropsWithRef<"input"> & { unit: string; invalid?: boolean }) {
  return (
    <div
      className={cn(
        "flex w-full overflow-hidden rounded-lg border bg-white transition-colors focus-within:ring-2 focus-within:ring-brand-500/30",
        invalid ? "border-red-500" : "border-border focus-within:border-brand-500",
        props.readOnly && "bg-background",
        className,
      )}
    >
      <input
        type="text"
        autoComplete="off"
        {...props}
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm tabular-nums text-foreground outline-none placeholder:text-muted/60"
      />
      <span
        aria-hidden="true"
        className="flex shrink-0 items-center border-l border-border bg-background px-3 text-sm font-medium text-muted"
      >
        {unit}
      </span>
    </div>
  );
}

/**
 * Filväljare. Den native-renderade knappen stylas med file:-varianterna så att
 * kontrollen ser ut som en knapp med filnamn bredvid, inte som ett textfält med
 * en systemknapp inuti.
 */
export function FileInput({
  className,
  ...props
}: ComponentPropsWithRef<"input">) {
  return (
    <input
      type="file"
      className={cn(
        "w-full cursor-pointer rounded-lg border border-border bg-white text-sm text-muted",
        "file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:border-r file:border-border",
        "file:bg-brand-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-brand-700",
        "hover:file:bg-brand-100 focus-visible:border-brand-500 focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea className={cn(control, "min-h-28 resize-y", className)} {...props} />
  );
}

export function Select({
  className,
  ...props
}: ComponentPropsWithRef<"select">) {
  return <select className={cn(control, "pr-8", className)} {...props} />;
}

/** Röd felruta för formulär. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

/** Grön bekräftelseruta för formulär. */
export function FormSuccess({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      {children}
    </p>
  );
}
