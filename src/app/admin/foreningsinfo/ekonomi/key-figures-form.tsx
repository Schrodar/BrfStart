"use client";

import Link from "next/link";
import {
  useActionState,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  FIGURES,
  INPUTS,
  INPUT_IDS,
  checkInputs,
  computeFigures,
  formatInputValue,
  parseAmount,
  sumAreas,
  type Errors,
  type FigureOk,
  type FigureResult,
  type InputId,
  type RawValues,
  type Values,
} from "@/lib/key-figures";
import type { ApartmentArea, EconomyFigures } from "@/lib/types";
import {
  Button,
  Card,
  CardBody,
  Field,
  FormError,
  FormSuccess,
  Input,
  UnitInput,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { saveEconomyFiguresAction } from "./actions";
import { ApartmentAreaList } from "./apartment-area-list";
import type { EconomyFormState } from "./form-state";

const FISCAL_YEAR_ID = "kf-fiscalYear";
const fieldId = (id: InputId) => `kf-${id}`;

function focusField(id: InputId) {
  document.getElementById(fieldId(id))?.focus();
}

/** Formulärets textvärden ur sparat underlag. */
function toRaw(figures: EconomyFigures): RawValues {
  return Object.fromEntries(
    INPUT_IDS.map((id) => [id, formatInputValue(figures[id])]),
  ) as RawValues;
}

/** Finns det lägenheter i listan är bostadsrättsytan deras summa. */
function withApartments(raw: RawValues, apartments: ApartmentArea[]): RawValues {
  if (apartments.length === 0) return raw;
  return { ...raw, condoArea: formatInputValue(sumAreas(apartments)) };
}

/**
 * Ett fälts innehåll, tolkat. "1560000" och "1 560 000" ger samma nyckel, så
 * att det inte räknas som en ändring när fältet snyggas till.
 */
function fieldKey(raw: RawValues, id: InputId): string {
  const parsed = parseAmount(raw[id], INPUTS[id].unit);
  return "error" in parsed ? `!${raw[id].trim()}` : String(parsed.value);
}

function valuesKey(raw: RawValues): string {
  return INPUT_IDS.map((id) => fieldKey(raw, id)).join("|");
}

function snapshotOf(
  raw: RawValues,
  fiscalYear: string,
  apartments: ApartmentArea[],
): string {
  return JSON.stringify([valuesKey(raw), fiscalYear.trim(), apartments]);
}

interface Calculation {
  /** Vad uträkningen byggde på. Ändras fälten blir resultatet inaktuellt. */
  key: string;
  raw: RawValues;
  errors: Errors;
  results: FigureResult[];
}

function runCalculation(raw: RawValues): Calculation {
  const { values, errors } = checkInputs(raw);
  return {
    key: valuesKey(raw),
    raw,
    errors,
    results: computeFigures(values, errors),
  };
}

/** Visas innan något räknats ut, så att man ser vad knappen ger. */
const EXAMPLE = (() => {
  const values = Object.fromEntries(
    INPUT_IDS.map((id) => [id, null]),
  ) as Values;
  values.annualFees = 1_560_000;
  values.condoArea = 2_000;
  return computeFigures(values, {}).find(
    (r): r is FigureOk => r.status === "ok",
  );
})();

/**
 * Nyckeltalen räknas ut i webbläsaren när man klickar på Beräkna, så att
 * styrelsen ser resultatet och uträkningen innan något sparas. Sparandet
 * kräver att resultatet är uträknat för exakt de siffror som står i fälten –
 * det som publiceras är alltså det man har granskat.
 */
export function KeyFiguresForm({
  initial,
  savedAtLabel,
}: {
  initial: EconomyFigures;
  /** "16 sep. 2026 14:30" – formaterat på servern för att undvika tidszonsglapp. */
  savedAtLabel: string | null;
}) {
  const [raw, setRaw] = useState<RawValues>(() => toRaw(initial));
  const [apartments, setApartments] = useState<ApartmentArea[]>(
    initial.apartmentAreas,
  );
  const [fiscalYear, setFiscalYear] = useState(initial.fiscalYear);
  const [yearError, setYearError] = useState<string>();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const resultsRef = useRef<HTMLHeadingElement>(null);

  // Finns det sparade siffror visas deras resultat direkt: det är det som
  // ligger ute på /ekonomi just nu.
  const [calc, setCalc] = useState<Calculation | null>(() => {
    const start = withApartments(toRaw(initial), initial.apartmentAreas);
    return INPUT_IDS.some((id) => start[id] !== "") ? runCalculation(start) : null;
  });

  const [initialSnapshot] = useState(() =>
    snapshotOf(
      withApartments(toRaw(initial), initial.apartmentAreas),
      initial.fiscalYear,
      initial.apartmentAreas,
    ),
  );
  const [state, formAction, pending] = useActionState<
    EconomyFormState,
    FormData
  >(saveEconomyFiguresAction, { savedKey: initialSnapshot });

  const current = withApartments(raw, apartments);
  const snapshot = snapshotOf(current, fiscalYear, apartments);
  const stale = calc !== null && calc.key !== valuesKey(current);
  const hasErrors = calc !== null && Object.keys(calc.errors).length > 0;
  const publishable =
    calc?.results.filter((r) => r.status === "ok").length ?? 0;
  const dirty = snapshot !== state.savedKey;
  const canSave = calc !== null && !stale && !hasErrors && !pending;

  function setField(id: InputId, value: string) {
    setRaw((prev) => ({ ...prev, [id]: value }));
  }

  /** Snyggar till ett giltigt tal när man lämnar fältet: "1560000" → "1 560 000". */
  function tidy(id: InputId) {
    const parsed = parseAmount(raw[id], INPUTS[id].unit);
    if (!("error" in parsed) && parsed.value !== null) {
      setField(id, formatInputValue(parsed.value));
    }
  }

  /** Felet står kvar tills fältet ändras – därefter vet vi inte om det gäller. */
  function errorFor(id: InputId): string | undefined {
    if (!calc || fieldKey(calc.raw, id) !== fieldKey(current, id)) {
      return undefined;
    }
    return calc.errors[id];
  }

  function calculate() {
    const next = runCalculation(current);
    // Synkront, så att felen och resultatet finns på sidan när fokus flyttas.
    flushSync(() => setCalc(next));
    // Till första felet, annars till resultatet så att det syns och
    // skärmläsare läser upp det.
    const firstInvalid = INPUT_IDS.find((id) => next.errors[id]);
    if (firstInvalid) focusField(firstInvalid);
    else resultsRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter" || event.defaultPrevented) return;
    if (!(event.target instanceof HTMLInputElement)) return;
    // Enter i ett fält räknar ut. Utan det här skulle Enter skicka formuläret
    // och spara av misstag.
    event.preventDefault();
    calculate();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSave) {
      event.preventDefault();
      return;
    }
    if (publishable > 0 && !fiscalYear.trim()) {
      event.preventDefault();
      setYearError(
        "Ange vilket räkenskapsår siffrorna gäller – det visas tillsammans med nyckeltalen.",
      );
      document.getElementById(FISCAL_YEAR_ID)?.focus();
      return;
    }
    setSubmitted(snapshot);
  }

  function onApartmentsChange(next: ApartmentArea[]) {
    // Den första lägenheten ersätter en inskriven yta. Töms listan igen ska
    // inte en gammal siffra dyka upp i fältet.
    if (apartments.length === 0 && next.length > 0) setField("condoArea", "");
    setApartments(next);
  }

  let saveHint: string;
  if (calc === null) {
    saveHint = "Klicka på Beräkna och kontrollera resultatet innan du sparar.";
  } else if (stale) {
    saveHint = "Klicka på Beräkna igen innan du sparar.";
  } else if (hasErrors) {
    saveHint = "Rätta de markerade fälten innan du sparar.";
  } else if (dirty) {
    saveHint = "Du har osparade ändringar.";
  } else if (savedAtLabel) {
    saveHint = `Senast sparat ${savedAtLabel}.`;
  } else {
    saveHint = "";
  }

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="apartmentAreas"
        value={JSON.stringify(apartments)}
      />
      <input type="hidden" name="snapshotKey" value={snapshot} />

      <Card>
        <CardBody>
          <Field
            label="Räkenskapsår"
            htmlFor={FISCAL_YEAR_ID}
            hint="T.ex. 2025 eller 2024/2025. Siffrorna nedan hämtar du ur årsredovisningen för det året."
          >
            <Input
              id={FISCAL_YEAR_ID}
              name="fiscalYear"
              value={fiscalYear}
              onChange={(e) => {
                setFiscalYear(e.target.value);
                setYearError(undefined);
              }}
              maxLength={20}
              autoComplete="off"
              aria-invalid={yearError ? true : undefined}
              aria-describedby={yearError ? `${FISCAL_YEAR_ID}-error` : undefined}
              className={cn("sm:max-w-40", yearError && "border-red-500")}
            />
            {yearError ? (
              <p id={`${FISCAL_YEAR_ID}-error`} className="text-sm text-red-700">
                {yearError}
              </p>
            ) : null}
          </Field>
        </CardBody>
      </Card>

      {FIGURES.map((figure, index) => (
        <Card key={figure.id}>
          <CardBody className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                <span className="mr-2 text-muted">{index + 1}.</span>
                {figure.title}
              </h2>
              <p className="mt-1 text-sm text-muted">{figure.formula}</p>
            </div>

            {figure.inputs.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {figure.inputs.map((id) => {
                  const derived = id === "condoArea" && apartments.length > 0;
                  return (
                    <AmountField
                      key={id}
                      id={id}
                      value={current[id]}
                      error={errorFor(id)}
                      readOnly={derived}
                      hint={
                        derived
                          ? `Summan av ${apartments.length} ${apartments.length === 1 ? "lägenhet" : "lägenheter"} i listan nedan. Ta bort dem för att skriva in ytan själv.`
                          : undefined
                      }
                      onChange={(value) => setField(id, value)}
                      onBlur={() => tidy(id)}
                    />
                  );
                })}
              </div>
            ) : null}

            {figure.id === "annualFee" ? (
              <ApartmentAreaList
                apartments={apartments}
                onChange={onApartmentsChange}
              />
            ) : null}
          </CardBody>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={calculate} className="min-w-32">
          Beräkna
        </Button>
        {stale ? (
          <p className="text-sm text-amber-800">
            Uppgifterna har ändrats – klicka på Beräkna för att se de nya talen.
          </p>
        ) : null}
      </div>

      <Card>
        <CardBody className="space-y-5">
          <h2
            ref={resultsRef}
            tabIndex={-1}
            className="text-lg font-semibold text-foreground"
          >
            Resultat
          </h2>

          {calc === null ? (
            <ExampleResult />
          ) : (
            <div
              className={cn(
                "space-y-3 transition-opacity",
                stale && "opacity-50",
              )}
            >
              {hasErrors ? (
                <FormError>
                  Rätta de markerade fälten ovan. Nyckeltal som bygger på dem
                  kan inte räknas ut.
                </FormError>
              ) : null}
              {calc.results.map((result) => (
                <ResultCard key={result.figure.id} result={result} />
              ))}
              {publishable < FIGURES.length ? (
                <p className="text-sm text-muted">
                  Nyckeltal som inte kan räknas ut visas inte på sidan
                  Föreningens ekonomi.
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-3 border-t border-border pt-5">
            {state.error && submitted === snapshot ? (
              <FormError>{state.error}</FormError>
            ) : null}
            {state.success && !dirty ? (
              <FormSuccess>
                {state.success}{" "}
                <Link href="/ekonomi" className="font-medium underline">
                  Visa sidan
                </Link>
              </FormSuccess>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button type="submit" disabled={!canSave}>
                {pending ? "Sparar…" : "Spara nyckeltalen"}
              </Button>
              {saveHint ? (
                <p className="text-sm text-muted">{saveHint}</p>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>
    </form>
  );
}

function AmountField({
  id,
  value,
  error,
  hint,
  readOnly,
  onChange,
  onBlur,
}: {
  id: InputId;
  value: string;
  error?: string;
  hint?: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const def = INPUTS[id];
  const inputId = fieldId(id);
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {def.label}
        <span className="sr-only">
          {def.unit === "kr" ? ", i kronor" : ", i kvadratmeter"}
        </span>
        {def.optional ? (
          <span className="font-normal text-muted"> (valfritt)</span>
        ) : null}
      </label>
      <UnitInput
        id={inputId}
        name={id}
        unit={def.unit}
        value={value}
        readOnly={readOnly}
        // Siffertangentbordet på mobilen saknar minustecken.
        inputMode={def.allowNegative ? "text" : "decimal"}
        invalid={Boolean(error)}
        aria-describedby={error ? `${errorId} ${hintId}` : hintId}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <p id={hintId} className="text-xs leading-relaxed text-muted">
        {hint ?? def.hint}
      </p>
    </div>
  );
}

/** "a", "a och b", "a, b och c" – som knappar som flyttar fokus till fältet. */
function FieldLinks({ ids }: { ids: InputId[] }) {
  return ids.map((id, i) => (
    <span key={id}>
      {i === 0 ? "" : i === ids.length - 1 ? " och " : ", "}
      <button
        type="button"
        onClick={() => focusField(id)}
        className="font-medium underline underline-offset-2 hover:no-underline"
      >
        {INPUTS[id].label.toLowerCase()}
      </button>
    </span>
  ));
}

function ResultCard({ result }: { result: FigureResult }) {
  const { figure } = result;

  if (result.status === "ok") {
    return (
      <div className="rounded-lg border border-brand-100 bg-brand-50/50 p-4">
        <p className="text-sm font-medium text-muted">{figure.title}</p>
        <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
          {figure.resultLabel}:{" "}
          <span className="whitespace-nowrap tabular-nums text-brand-700">
            {result.number} {result.unit}
          </span>
        </p>
        <div className="mt-3 space-y-0.5 border-t border-brand-100 pt-3 text-sm text-muted">
          {result.explanation.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    );
  }

  if (result.status === "missing") {
    return (
      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-sm font-medium text-foreground">{figure.title}</p>
        <p className="mt-1 text-sm text-muted">
          Kan inte räknas ut ännu. Fyll i <FieldLinks ids={result.missing} />.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/60 p-4">
      <p className="text-sm font-medium text-foreground">{figure.title}</p>
      <p className="mt-1 text-sm text-red-800">
        {result.invalid.length > 0 ? (
          <>
            Kan inte räknas ut – rätta <FieldLinks ids={result.invalid} />.
          </>
        ) : (
          "Kan inte räknas ut med de här siffrorna."
        )}
      </p>
    </div>
  );
}

function ExampleResult() {
  if (!EXAMPLE) return null;
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <p className="text-sm text-muted">
        Fyll i uppgifterna ovan och klicka på{" "}
        <strong className="font-medium text-foreground">Beräkna</strong>.
        Resultatet visas här tillsammans med uträkningen.
      </p>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
        Exempel
      </p>
      <p className="mt-1 font-semibold text-foreground">
        {EXAMPLE.figure.resultLabel}: {EXAMPLE.number} {EXAMPLE.unit}
      </p>
      <div className="mt-2 space-y-0.5 text-sm text-muted">
        {EXAMPLE.explanation.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}
