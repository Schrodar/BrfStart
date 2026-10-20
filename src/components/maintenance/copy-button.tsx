"use client";

import { useState } from "react";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui";
import { cn } from "@/lib/utils";

function ClipboardIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * Kopierar en text till urklipp – protokolltexten och mejlet till anmälaren.
 * Texten byggs först vid klicket, så att den alltid speglar det som står på
 * skärmen just då. En ikon visar att knappen kopierar, och efter klicket
 * bekräftar den med en bock och "Kopierat!".
 *
 * Saknas Clipboard-API:t (gammal webbläsare, osäker anslutning) markeras
 * texten i ett dolt fält i stället och kopieras med execCommand.
 */
export function CopyButton({
  getText,
  label = "Kopiera för protokoll",
  disabled,
  variant = "secondary",
  size = "sm",
}: {
  getText: () => string;
  label?: string;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    const text = getText();
    if (!text) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand("copy");
      area.remove();
    }
    setState(ok ? "done" : "failed");
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={disabled}
      className={cn(
        buttonClasses(variant, size),
        state === "done" &&
          "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600",
      )}
    >
      {state === "done" ? <CheckIcon /> : <ClipboardIcon />}
      <span aria-live="polite">
        {state === "done"
          ? "Kopierat!"
          : state === "failed"
            ? "Kunde inte kopiera"
            : label}
      </span>
    </button>
  );
}
