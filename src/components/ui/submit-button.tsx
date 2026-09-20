"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonVariant } from "./button";

/** Submit-knapp som visar pending-läge automatiskt (kräver att den ligger i ett <form>). */
export function SubmitButton({
  children,
  pendingText = "Sparar…",
  variant,
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className={className}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
