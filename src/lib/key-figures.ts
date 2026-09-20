/**
 * =============================================================================
 * NYCKELTAL – årsavgift, skuldsättning, sparande och räntekänslighet
 * =============================================================================
 * Definitionerna följer årsredovisningslagen 6 kap. 3 a § och Bokföringsnämndens
 * vägledning till BFNAR 2023:1. Då går siffrorna på /ekonomi att stämma av mot
 * flerårsöversikten i föreningens årsredovisning.
 *
 *   Årsavgift per m²     = årsavgifter / bostadsrättsyta
 *   Skuldsättning per m² = räntebärande skulder / totalyta
 *   Sparande per m²      = justerat resultat / totalyta
 *   Räntekänslighet      = räntebärande skulder / årsavgifter   (i procent)
 *
 *   totalyta          = yta upplåten med bostadsrätt + yta upplåten med hyresrätt
 *   justerat resultat = årets resultat + avskrivningar + utrangeringar
 *                       + kostnadsfört planerat underhåll ± väsentliga engångsposter
 *
 * Observera att skuldsättningen delas med TOTALYTAN, inte bostadsrättsytan –
 * det är lagens nyckeltal. (BFN:s tillägg "per kvm upplåten med bostadsrätt"
 * är ett annat tal.)
 *
 * Samma modul används av adminformuläret (knappen Beräkna), av servern innan
 * något sparas och av den publika sidan. Den får därför inte importera något
 * som bara finns på servern.
 *
 * Division med noll kan inte ske: alla nämnare valideras till större än noll,
 * och divide() vägrar ändå. Ett tal som inte går att räkna ut visas inte.
 */

export type InputId =
  | "annualFees"
  | "condoArea"
  | "interestBearingDebt"
  | "totalArea"
  | "netResult"
  | "depreciation"
  | "plannedMaintenance"
  | "disposals"
  | "nonRecurring";

export type Unit = "kr" | "m²";

export interface InputDef {
  label: string;
  unit: Unit;
  hint: string;
  /** Årets resultat och engångsjusteringen kan vara negativa. Inget annat får vara det. */
  allowNegative?: boolean;
  /** Nämnare i någon uträkning – måste vara större än noll. */
  divisor?: boolean;
  /** Tomt fält räknas som 0. */
  optional?: boolean;
}

export const INPUTS: Record<InputId, InputDef> = {
  annualFees: {
    label: "Totala årsavgifter per år",
    unit: "kr",
    divisor: true,
    hint: "Årsavgifter enligt bostadsrättslagen, inklusive förbrukningsavgifter för t.ex. värme och vatten. Hyror för lokaler och p-platser och frivilliga tillval som bredband räknas inte.",
  },
  condoArea: {
    label: "Total bostadsrättsyta",
    unit: "m²",
    divisor: true,
    hint: "All yta som upplåts med bostadsrätt – även lokaler och garage om de upplåts med bostadsrätt. Står i taxeringsbeslutet.",
  },
  interestBearingDebt: {
    label: "Räntebärande skulder",
    unit: "kr",
    hint: "Föreningens lån på balansdagen, alltså räkenskapsårets sista dag. Skriv 0 om föreningen inte har några lån.",
  },
  totalArea: {
    label: "Totalyta",
    unit: "m²",
    divisor: true,
    hint: "All yta i föreningens hus som det tas ut avgift eller hyra för: bostadsrättsytan plus det som hyrs ut, t.ex. hyreslägenheter, lokaler och garage.",
  },
  netResult: {
    label: "Årets resultat",
    unit: "kr",
    allowNegative: true,
    hint: "Från resultaträkningen. Är resultatet negativt skriver du ett minustecken före, t.ex. -150 000.",
  },
  depreciation: {
    label: "Årets avskrivningar",
    unit: "kr",
    hint: "Från resultaträkningen.",
  },
  plannedMaintenance: {
    label: "Kostnadsfört planerat underhåll",
    unit: "kr",
    hint: "Underhåll enligt underhållsplanen som bokförts som kostnad, t.ex. stambyte eller takomläggning. Skriv 0 om inget sådant underhåll gjordes.",
  },
  disposals: {
    label: "Utrangeringar",
    unit: "kr",
    optional: true,
    hint: "Lämna tomt om föreningen inte gjorde några utrangeringar under året.",
  },
  nonRecurring: {
    label: "Justering för engångsposter",
    unit: "kr",
    optional: true,
    allowNegative: true,
    hint: "Väsentliga poster utanför den normala verksamheten: kostnader skrivs som positiva tal, intäkter med minustecken. Lämna tomt om det inte fanns några.",
  },
};

export type FigureId = "annualFee" | "debt" | "savings" | "interestSensitivity";

export interface FigureDef {
  id: FigureId;
  /** Rubrik, t.ex. "Årsavgift per m²". */
  title: string;
  /** Början på resultatmeningen: "Genomsnittlig årsavgift: 780 kr/m² och år". */
  resultLabel: string;
  /** Hur talet räknas, i ord. Visas för styrelsen i adminformuläret. */
  formula: string;
  /** Vad talet betyder, för besökare på /ekonomi. */
  description: string;
  /** Fälten som fylls i i just det här avsnittet av formuläret. */
  inputs: InputId[];
  /** Allt uträkningen kräver, även fält från andra avsnitt. Valfria fält står inte med. */
  requires: InputId[];
}

export const FIGURES: readonly FigureDef[] = [
  {
    id: "annualFee",
    title: "Årsavgift per m²",
    resultLabel: "Genomsnittlig årsavgift",
    formula: "Totala årsavgifter delat med total bostadsrättsyta.",
    description:
      "Genomsnittlig årsavgift per kvadratmeter som upplåts med bostadsrätt.",
    inputs: ["annualFees", "condoArea"],
    requires: ["annualFees", "condoArea"],
  },
  {
    id: "debt",
    title: "Skuldsättning per m²",
    resultLabel: "Skuldsättning",
    formula:
      "Räntebärande skulder delat med totalytan – all yta föreningen tar ut avgift eller hyra för, inte bara bostadsrättsytan.",
    description:
      "Föreningens räntebärande lån per kvadratmeter av all yta som föreningen tar ut avgift eller hyra för.",
    inputs: ["interestBearingDebt", "totalArea"],
    requires: ["interestBearingDebt", "totalArea"],
  },
  {
    id: "savings",
    title: "Sparande per m²",
    resultLabel: "Sparande",
    formula:
      "Justerat resultat delat med totalytan från avsnitt 2. Justerat resultat är årets resultat plus avskrivningar, utrangeringar och planerat underhåll, justerat för engångsposter.",
    description:
      "Det föreningen har kvar varje år till underhåll och amortering, per kvadratmeter.",
    inputs: [
      "netResult",
      "depreciation",
      "plannedMaintenance",
      "disposals",
      "nonRecurring",
    ],
    requires: ["netResult", "depreciation", "plannedMaintenance", "totalArea"],
  },
  {
    id: "interestSensitivity",
    title: "Räntekänslighet",
    resultLabel: "Räntekänslighet",
    formula:
      "Räntebärande skulder delat med totala årsavgifter. Inga nya uppgifter behövs – talet räknas fram ur avsnitt 1 och 2.",
    description:
      "Hur många procent årsavgifterna kan behöva höjas om räntan stiger med en procentenhet.",
    inputs: [],
    requires: ["interestBearingDebt", "annualFees"],
  },
];

/** Alla fält, i formulärets ordning. */
export const INPUT_IDS: readonly InputId[] = FIGURES.flatMap((f) => f.inputs);

export type Values = Record<InputId, number | null>;
export type RawValues = Record<InputId, string>;
export type Errors = Partial<Record<InputId, string>>;

// ---------------------------------------------------------------------------
// Formatering
// ---------------------------------------------------------------------------

const formatters = new Map<number, Intl.NumberFormat>();

/** Svensk talformatering: "1 560 000", "72,5", "−150 000". */
export function formatNumber(value: number, maxDecimals = 0): string {
  let formatter = formatters.get(maxDecimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("sv-SE", {
      maximumFractionDigits: maxDecimals,
    });
    formatters.set(maxDecimals, formatter);
  }
  const text = formatter.format(value);
  // Ett litet negativt tal avrundas till "−0", som ingen vill läsa.
  return /^[−-]0$/.test(text) ? "0" : text;
}

/** Värdet så som det står i ett inmatningsfält. Tomt för null. */
export function formatInputValue(value: number | null): string {
  return value === null ? "" : formatNumber(value, 2);
}

// ---------------------------------------------------------------------------
// Tolkning och validering
// ---------------------------------------------------------------------------

export type ParseResult = { value: number | null } | { error: string };

/**
 * Tolkar ett tal som det brukar skrivas på svenska: "1 560 000", "72,5",
 * "-150 000". Tomt fält ger null. Mellanslag som tusentalsavgränsare, komma
 * eller punkt som decimaltecken, och enheten får skrivas med ("72 m²").
 * Om talet får vara negativt avgörs i validateValues, inte här.
 */
export function parseAmount(raw: string, unit: Unit): ParseResult {
  const cleaned = raw
    .trim()
    .replace(unit === "kr" ? /\s*(kr|kronor|:-)$/i : /\s*(m²|m2|kvm)$/i, "")
    // \s omfattar även hårt och smalt mellanslag, som Intl och kalkylark använder.
    .replace(/\s/g, "")
    .replace(/[−–]/g, "-")
    .replace(",", ".");

  if (cleaned === "") return { value: null };
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    return {
      error:
        unit === "kr"
          ? "Skriv beloppet med siffror, t.ex. 1 560 000."
          : "Skriv ytan med siffror, t.ex. 2 000.",
    };
  }
  const value = Number(cleaned);
  return { value: Object.is(value, -0) ? 0 : value };
}

/** Långt över vad någon förening har – fångar felskrivningar och Infinity. */
const MAX_ABS = 1e13;

/**
 * Kontrollerar tolkade värden. Används både på inskrivna värden och på det som
 * ligger sparat, så att en rad som ändrats för hand i databasen inte kan ge
 * orimliga tal på /ekonomi.
 *
 * Tomma fält är aldrig fel i sig: styrelsen kanske bara vill visa några av
 * nyckeltalen. Vilka uppgifter som saknas för ett visst tal redovisas i stället
 * i resultatet (status "missing").
 */
export function validateValues(values: Values, parseErrors: Errors = {}): Errors {
  const errors: Errors = { ...parseErrors };

  for (const id of INPUT_IDS) {
    const value = values[id];
    if (errors[id] || value === null) continue;
    const def = INPUTS[id];

    if (!Number.isFinite(value) || Math.abs(value) > MAX_ABS) {
      errors[id] = "Talet är orimligt stort – kontrollera att det stämmer.";
    } else if (value < 0 && !def.allowNegative) {
      errors[id] = "Negativa tal accepteras inte.";
    } else if (value === 0 && def.divisor) {
      errors[id] =
        def.unit === "m²"
          ? "Ytan måste vara större än 0 – det går inte att dela med 0."
          : "Beloppet måste vara större än 0 – det går inte att dela med 0.";
    }
  }

  const { condoArea, totalArea } = values;
  if (
    !errors.condoArea &&
    !errors.totalArea &&
    condoArea !== null &&
    totalArea !== null &&
    totalArea < condoArea
  ) {
    errors.totalArea = `Totalytan kan inte vara mindre än bostadsrättsytan (${formatNumber(condoArea, 2)} m²), eftersom den ingår i totalytan.`;
  }

  return errors;
}

/** Tolkar och kontrollerar formulärets råa textvärden. */
export function checkInputs(raw: RawValues): { values: Values; errors: Errors } {
  const values = {} as Values;
  const parseErrors: Errors = {};

  for (const id of INPUT_IDS) {
    const parsed = parseAmount(raw[id] ?? "", INPUTS[id].unit);
    if ("error" in parsed) {
      values[id] = null;
      parseErrors[id] = parsed.error;
    } else {
      values[id] = parsed.value;
    }
  }

  return { values, errors: validateValues(values, parseErrors) };
}

/**
 * Summan av lägenheternas ytor, avrundad till två decimaler – annars blir
 * 72,1 + 54,2 = 126,30000000000001.
 */
export function sumAreas(areas: readonly { sqm: number }[]): number {
  return Math.round(areas.reduce((sum, a) => sum + a.sqm, 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Uträkning
// ---------------------------------------------------------------------------

export interface FigureOk {
  status: "ok";
  figure: FigureDef;
  value: number;
  /** Avrundat och formaterat, t.ex. "780". */
  number: string;
  /** T.ex. "kr/m² och år". */
  unit: string;
  /** Uträkningen rad för rad, med de inskrivna siffrorna. */
  explanation: string[];
}

export interface FigureMissing {
  status: "missing";
  figure: FigureDef;
  missing: InputId[];
}

export interface FigureInvalid {
  status: "invalid";
  figure: FigureDef;
  invalid: InputId[];
}

export type FigureResult = FigureOk | FigureMissing | FigureInvalid;

type Calculation = Omit<FigureOk, "status" | "figure">;

/** Sista skyddet mot division med noll. Valideringen ska redan ha stoppat det. */
function divide(numerator: number, denominator: number): number | null {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }
  return numerator / denominator;
}

/** "=" när avrundningen inte ändrar talet, annars "≈". */
function equals(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  return Math.abs(Math.round(value * factor) / factor - value) < 1e-9
    ? "="
    : "≈";
}

const num = (value: number) => formatNumber(value, 2);
const kr = (value: number) => `${num(value)} kr`;
const sqm = (value: number) => `${num(value)} m²`;

/** "700 000 + 5 000 000 − 150 000" */
function sumExpression(terms: number[]): string {
  return terms
    .map((term, i) =>
      i === 0 ? num(term) : `${term < 0 ? "−" : "+"} ${num(Math.abs(term))}`,
    )
    .join(" ");
}

type Get = (id: InputId) => number;

const CALCULATE: Record<
  FigureId,
  (get: Get, values: Values) => Calculation | null
> = {
  annualFee(get) {
    const fees = get("annualFees");
    const area = get("condoArea");
    const value = divide(fees, area);
    if (value === null) return null;
    const number = formatNumber(value);
    const unit = "kr/m² och år";
    return {
      value,
      number,
      unit,
      explanation: [
        `Totala årsavgifter: ${kr(fees)} per år`,
        `Total bostadsrättsyta: ${sqm(area)}`,
        `${num(fees)} / ${num(area)} ${equals(value, 0)} ${number} ${unit}.`,
      ],
    };
  },

  debt(get) {
    const debt = get("interestBearingDebt");
    const area = get("totalArea");
    const value = divide(debt, area);
    if (value === null) return null;
    const number = formatNumber(value);
    const unit = "kr/m²";
    return {
      value,
      number,
      unit,
      explanation: [
        `Räntebärande skulder: ${kr(debt)}`,
        `Totalyta: ${sqm(area)}`,
        `${num(debt)} / ${num(area)} ${equals(value, 0)} ${number} ${unit}.`,
      ],
    };
  },

  savings(get, values) {
    const result = get("netResult");
    const depreciation = get("depreciation");
    const maintenance = get("plannedMaintenance");
    const disposals = values.disposals ?? 0;
    const nonRecurring = values.nonRecurring ?? 0;
    const area = get("totalArea");

    const adjusted =
      result + depreciation + maintenance + disposals + nonRecurring;
    const value = divide(adjusted, area);
    if (value === null) return null;

    const terms = [result, depreciation, maintenance];
    const lines = [
      `Årets resultat: ${kr(result)}`,
      `Årets avskrivningar: ${kr(depreciation)}`,
      `Kostnadsfört planerat underhåll: ${kr(maintenance)}`,
    ];
    // De valfria justeringarna tas bara med när de finns – annars blir
    // uträkningen längre utan att säga något.
    if (disposals !== 0) {
      terms.push(disposals);
      lines.push(`Utrangeringar: ${kr(disposals)}`);
    }
    if (nonRecurring !== 0) {
      terms.push(nonRecurring);
      lines.push(`Justering för engångsposter: ${kr(nonRecurring)}`);
    }

    const number = formatNumber(value);
    const unit = "kr/m² och år";
    return {
      value,
      number,
      unit,
      explanation: [
        ...lines,
        `Justerat resultat: ${sumExpression(terms)} = ${kr(adjusted)}`,
        `Totalyta: ${sqm(area)}`,
        `${num(adjusted)} / ${num(area)} ${equals(value, 0)} ${number} ${unit}.`,
      ],
    };
  },

  interestSensitivity(get) {
    const debt = get("interestBearingDebt");
    const fees = get("annualFees");
    // En procentenhet av skulderna delat med avgifterna, uttryckt i procent,
    // blir samma sak som skulderna delat med avgifterna.
    const value = divide(debt, fees);
    if (value === null) return null;
    const onePercent = debt / 100;
    const number = formatNumber(value, 1);
    const unit = "%";
    return {
      value,
      number,
      unit,
      explanation: [
        `Räntebärande skulder: ${kr(debt)}`,
        `Totala årsavgifter: ${kr(fees)} per år`,
        `En procentenhet högre ränta: ${num(debt)} × 1 % = ${kr(onePercent)} mer i räntekostnad per år.`,
        `${num(onePercent)} / ${num(fees)} ${equals(value, 1)} ${number} % av årsavgifterna.`,
      ],
    };
  },
};

/**
 * Räknar ut alla nyckeltal. Ett tal räknas bara ut när allt det behöver är
 * ifyllt och giltigt; annars talar resultatet om vad som saknas eller är fel.
 */
export function computeFigures(values: Values, errors: Errors): FigureResult[] {
  return FIGURES.map((figure): FigureResult => {
    const involved = [...new Set([...figure.requires, ...figure.inputs])];
    const invalid = involved.filter((id) => errors[id]);
    if (invalid.length > 0) return { status: "invalid", figure, invalid };

    const missing = figure.requires.filter((id) => values[id] === null);
    if (missing.length > 0) return { status: "missing", figure, missing };

    const get: Get = (id) => {
      const value = values[id];
      if (value === null) throw new Error(`Nyckeltal: ${id} saknas`);
      return value;
    };
    const calculation = CALCULATE[figure.id](get, values);
    // Kan bara hända om valideringen kringgåtts. Då visas talet inte alls.
    if (calculation === null) return { status: "invalid", figure, invalid: [] };

    return { status: "ok", figure, ...calculation };
  });
}

/** Nyckeltalen som går att räkna ut ur sparat underlag – det som visas på /ekonomi. */
export function publishedFigures(values: Values): FigureOk[] {
  return computeFigures(values, validateValues(values)).filter(
    (r): r is FigureOk => r.status === "ok",
  );
}
