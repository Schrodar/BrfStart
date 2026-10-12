"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { formatNumber, parseAmount, sumAreas } from "@/lib/key-figures";
import type { ApartmentArea } from "@/lib/types";
import { Button, UnitInput } from "@/components/ui";
import { cn } from "@/lib/utils";

const MAX_LABEL = 40;
/** En enskild yta över det här är nästan säkert en felskrivning. */
const MAX_SQM = 1_000_000;

interface AddErrors {
  label?: string;
  area?: string;
}

/**
 * Räknar fram bostadsrättsytan ur lägenheterna – för föreningar som inte har
 * summan färdig i taxeringsbeslutet (t.ex. småhus, där föreningen enligt BFN
 * själv får sammanställa den).
 *
 * Listan ägs av formuläret och sparas med resten av underlaget. Så länge den
 * inte är tom är det dess summa som är bostadsrättsytan.
 */
export function ApartmentAreaList({
  apartments,
  onChange,
}: {
  apartments: ApartmentArea[];
  onChange: (next: ApartmentArea[]) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(apartments.length > 0);
  const [label, setLabel] = useState("");
  const [area, setArea] = useState("");
  const [errors, setErrors] = useState<AddErrors>({});
  const [announcement, setAnnouncement] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const ids = {
    panel: `${id}-panel`,
    label: `${id}-label`,
    labelError: `${id}-label-error`,
    area: `${id}-area`,
    areaError: `${id}-area-error`,
  };

  function add() {
    const trimmed = label.trim();
    const next: AddErrors = {};

    if (!trimmed) {
      next.label = "Ange lägenhetens nummer.";
    } else if (
      apartments.some((a) => a.label.toLowerCase() === trimmed.toLowerCase())
    ) {
      next.label = `${trimmed} finns redan i listan.`;
    }

    let sqm = 0;
    const parsed = parseAmount(area, "m²");
    if ("error" in parsed) next.area = parsed.error;
    else if (parsed.value === null) next.area = "Ange lägenhetens yta.";
    else if (parsed.value < 0) next.area = "Negativa tal accepteras inte.";
    else if (parsed.value === 0) next.area = "Ytan måste vara större än 0.";
    else if (parsed.value > MAX_SQM)
      next.area = "Ytan verkar orimligt stor – kontrollera den.";
    else sqm = parsed.value;

    setErrors(next);
    if (next.label) return labelRef.current?.focus();
    if (next.area) return areaRef.current?.focus();

    const list = [...apartments, { label: trimmed, sqm }];
    onChange(list);
    setLabel("");
    setArea("");
    setAnnouncement(
      `${trimmed} lades till. Summa ${formatNumber(sumAreas(list), 2)} m².`,
    );
    labelRef.current?.focus();
  }

  function remove(index: number) {
    const removed = apartments[index];
    const list = apartments.filter((_, i) => i !== index);
    // Synkront, så att raden är borta ur DOM:en innan fokus flyttas nedan.
    flushSync(() => onChange(list));
    setAnnouncement(
      list.length > 0
        ? `${removed.label} togs bort. Summa ${formatNumber(sumAreas(list), 2)} m².`
        : `${removed.label} togs bort. Listan är tom – skriv in bostadsrättsytan direkt i fältet.`,
    );

    // Fokus till raden som tar den borttagnas plats, annars raden före, och
    // när listan är tom tillbaka till fältet för lägenhetsnummer.
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-remove]");
    const target =
      buttons && buttons.length > 0
        ? buttons[Math.min(index, buttons.length - 1)]
        : labelRef.current;
    target?.focus();
  }

  function onEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    // Enter lägger till lägenheten i stället för att skicka hela formuläret.
    event.preventDefault();
    add();
  }

  const total = sumAreas(apartments);

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={ids.panel}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
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
          className={cn("transition-transform", open && "rotate-90")}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        {apartments.length > 0
          ? `Lägenhetslistan (${apartments.length})`
          : "Räkna fram ytan från lägenheterna"}
      </button>

      <div
        id={ids.panel}
        hidden={!open}
        className="mt-3 space-y-4 rounded-lg border border-border bg-background p-4"
      >
        <p className="text-sm text-muted">
          Lägg till lägenheterna en i taget med sin yta. Summan blir föreningens
          totala bostadsrättsyta. Lokaler och garage som upplåts med bostadsrätt
          räknas också.
        </p>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={ids.label}
              className="text-sm font-medium text-foreground"
            >
              Lägenhet
            </label>
            <input
              ref={labelRef}
              id={ids.label}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={onEnter}
              maxLength={MAX_LABEL}
              autoComplete="off"
              placeholder="t.ex. 1101"
              aria-invalid={errors.label ? true : undefined}
              aria-describedby={errors.label ? ids.labelError : undefined}
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted/60 focus:ring-2 focus:ring-brand-500/30",
                errors.label
                  ? "border-red-500"
                  : "border-border focus:border-brand-500",
              )}
            />
            {errors.label ? (
              <p id={ids.labelError} className="text-sm text-red-700">
                {errors.label}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={ids.area}
              className="text-sm font-medium text-foreground"
            >
              Yta<span className="sr-only">, i kvadratmeter</span>
            </label>
            <UnitInput
              ref={areaRef}
              id={ids.area}
              unit="m²"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={onEnter}
              inputMode="decimal"
              placeholder="t.ex. 72,5"
              invalid={Boolean(errors.area)}
              aria-describedby={errors.area ? ids.areaError : undefined}
            />
            {errors.area ? (
              <p id={ids.areaError} className="text-sm text-red-700">
                {errors.area}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={add}
            className="sm:mt-[1.625rem]"
          >
            Lägg till
          </Button>
        </div>

        {apartments.length > 0 ? (
          <div>
            <ul
              ref={listRef}
              className="max-h-80 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface"
            >
              {apartments.map((apartment, index) => (
                <li
                  key={apartment.label}
                  className="flex items-center gap-3 py-1 pl-3 pr-1 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {apartment.label}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatNumber(apartment.sqm, 2)} m²
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-remove=""
                    onClick={() => remove(index)}
                    aria-label={`Ta bort ${apartment.label}`}
                    className="text-red-700 hover:bg-red-50"
                  >
                    Ta bort
                  </Button>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-center justify-between gap-3 px-3 text-sm font-semibold text-foreground">
              <span>
                Summa, {apartments.length}{" "}
                {apartments.length === 1 ? "lägenhet" : "lägenheter"}
              </span>
              <span className="tabular-nums">{formatNumber(total, 2)} m²</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">Inga lägenheter tillagda än.</p>
        )}

        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
}
