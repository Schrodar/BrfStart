"use client";

import type { ReactNode } from "react";
import { useCurrentMember } from "@/lib/use-current-member";

/**
 * Visar innehållet bara för den som inte är inloggad. Sidan runt omkring är
 * statisk, så det avgörs i webbläsaren – och visas inte förrän det är klart,
 * så att en inloggad aldrig ser det blinka till.
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { signedIn } = useCurrentMember();
  return signedIn === false ? <>{children}</> : null;
}
