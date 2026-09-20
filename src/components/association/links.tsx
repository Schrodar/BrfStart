import type { ReactNode } from "react";

/** E-postlänk (mailto). Renderar inget om e-post saknas. */
export function EmailLink({
  email,
  className,
  children,
}: {
  email: string;
  className?: string;
  children?: ReactNode;
}) {
  if (!email) return null;
  return (
    <a href={`mailto:${email}`} className={className}>
      {children ?? email}
    </a>
  );
}

/** Telefonlänk (tel) med mellanslag borttagna. Renderar inget om telefon saknas. */
export function PhoneLink({
  phone,
  className,
  children,
}: {
  phone: string;
  className?: string;
  children?: ReactNode;
}) {
  if (!phone) return null;
  return (
    <a href={`tel:${phone.replace(/\s/g, "")}`} className={className}>
      {children ?? phone}
    </a>
  );
}
