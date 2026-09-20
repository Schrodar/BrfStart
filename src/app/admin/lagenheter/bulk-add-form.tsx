"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/form";
import {
  buildApartmentNumbers,
  DEFAULT_NUMBER_START,
  floorCode,
  floorLabel,
  floorRange,
  type FloorSpec,
} from "@/lib/numbering";
import {
  Field,
  FormError,
  FormSuccess,
  Input,
  SubmitButton,
} from "@/components/ui";
import { bulkAddApartmentsAction } from "./actions";

/**
 * Massinläggning med levande förhandsvisning.
 *
 * Antalet sätts per våning – bottenvåningen har ofta färre lägenheter än
 * planen ovanför. "Antal per våning" fyller alla rader på en gång och är bara
 * en genväg; varje rad går att ändra efteråt.
 *
 * Numren räknas ut av samma funktion som servern använder, så det som visas i
 * förhandsvisningen är exakt det som skapas.
 */
export function BulkAddForm({
  buildingId,
  numberStart,
  numberTopDown = false,
}: {
  buildingId: string;
  numberStart: string | null | undefined;
  numberTopDown?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    bulkAddApartmentsAction,
    {},
  );

  // Entréplan som standard. Negativa våningar = källarplan.
  const [floorFrom, setFloorFrom] = useState(0);
  const [floorTo, setFloorTo] = useState(4);
  const [start, setStart] = useState(numberStart || DEFAULT_NUMBER_START);
  const [topDown, setTopDown] = useState(numberTopDown);
  const [floors, setFloors] = useState<FloorSpec[]>(floorRange(0, 4, 3));

  function setRange(from: number, to: number) {
    setFloorFrom(from);
    setFloorTo(to);
    // Behåll antalet för våningar som redan fanns, så att ett justerat
    // intervall inte slår sönder vad man skrivit in.
    const previous = new Map(floors.map((f) => [f.floor, f.count]));
    setFloors(
      floorRange(from, to, 3).map((f) => ({
        floor: f.floor,
        count: previous.get(f.floor) ?? 3,
      })),
    );
  }

  function setCount(floor: number, count: number) {
    setFloors((prev) =>
      prev.map((f) => (f.floor === floor ? { ...f, count } : f)),
    );
  }

  const preview = buildApartmentNumbers({ floors, start, topDown });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="buildingId" value={buildingId} />
      <input type="hidden" name="floorFrom" value={floorFrom} />
      <input type="hidden" name="floorTo" value={floorTo} />
      {state.error ? <FormError>{state.error}</FormError> : null}
      {state.success ? <FormSuccess>{state.success}</FormSuccess> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Våning från"
          htmlFor="floorFrom-input"
          required
          hint="0 = entréplan. Negativt för källarplan."
        >
          <Input
            id="floorFrom-input"
            type="number"
            min={-9}
            max={89}
            value={floorFrom}
            onChange={(e) => setRange(Number(e.target.value), floorTo)}
          />
        </Field>
        <Field label="Våning till" htmlFor="floorTo-input" required>
          <Input
            id="floorTo-input"
            type="number"
            min={-9}
            max={89}
            value={floorTo}
            onChange={(e) => setRange(floorFrom, Number(e.target.value))}
          />
        </Field>
        <Field
          label="Första föreningsnumret"
          htmlFor="start"
          hint="Löper genom hela föreningen. Lantmäteriets nummer räknas fram ur våningen."
        >
          <Input
            id="start"
            name="start"
            value={start}
            onChange={(e) => setStart(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            required
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="topDown"
          checked={topDown}
          onChange={(e) => setTopDown(e.target.checked)}
          className="size-4 accent-brand-600"
        />
        Börja numreringen högst upp i stället för på bottenplan
      </label>

      {floors.length === 0 ? (
        <p className="text-sm text-muted">
          Ange ett giltigt våningsintervall.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              Antal lägenheter per våning
            </p>
            <label className="flex items-center gap-2 text-sm text-muted">
              Sätt alla till
              <Input
                type="number"
                min={0}
                max={99}
                defaultValue={3}
                aria-label="Sätt samma antal på alla våningar"
                className="w-20"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n >= 0) {
                    setFloors((prev) => prev.map((f) => ({ ...f, count: n })));
                  }
                }}
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {floors.map((f) => (
              <label
                key={f.floor}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span className="text-sm text-muted">
                  {floorLabel(f.floor)}
                  <span className="ml-1 text-xs opacity-60">
                    ({floorCode(f.floor) || "–"})
                  </span>
                </span>
                <Input
                  name={`count-${f.floor}`}
                  type="number"
                  min={0}
                  max={99}
                  value={f.count}
                  aria-label={`Antal lägenheter på våning ${f.floor}`}
                  className="w-20"
                  onChange={(e) => setCount(f.floor, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg bg-brand-50/60 px-4 py-3 text-sm">
        {preview.length > 0 ? (
          <>
            <p className="font-medium text-foreground">
              {preview.length}{" "}
              {preview.length === 1 ? "lägenhet" : "lägenheter"} skapas
            </p>
            <p className="mt-1 text-muted">
              {preview.slice(0, 6).map((p) => p.label).join(", ")}
              {preview.length > 6
                ? `, … , ${preview[preview.length - 1].label}`
                : ""}
            </p>
            <p className="mt-1 text-xs text-muted">
              Format: föreningens nummer / Lantmäteriets nummer (våningsplan +
              lägenhet på planet).
            </p>
          </>
        ) : (
          <p className="text-muted">
            Inget skapas ännu – ange antal på minst en våning.
          </p>
        )}
      </div>

      <SubmitButton pendingText="Skapar…">Skapa lägenheter</SubmitButton>
    </form>
  );
}
