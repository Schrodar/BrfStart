/**
 * Lägenhetsnumrering.
 *
 * En lägenhet har två nummer, och båda behövs:
 *
 *   23    föreningens eget lägenhetsnummer – löpande genom hela föreningen,
 *         det som står på avin och i lägenhetsförteckningen
 *   1101  Lantmäteriets nummer – två siffror för våningsplanet, två för
 *         vilken lägenhet på planet
 *
 * De visas ihop som "23/1101" men lagras var för sig, eftersom föreningens
 * nummer används för att koppla en boende till sin lägenhet.
 *
 * Våningsplanet kodas från entréplan: entré = 10, uppåt 11, 12, 13 …, nedåt
 * 09, 08, 07 … I gränssnittet anges våningen relativt entrén (0, 1, -1), och
 * koden räknas fram härifrån.
 *
 * Modulen körs både i klienten (förhandsvisning) och på servern (skapande), så
 * den får inte importera något serverberoende och får aldrig kasta.
 */

/** Våningsplanet för entrén i Lantmäteriets kodning. */
const ENTRANCE_CODE = 10;

export interface FloorSpec {
  /** Våning relativt entréplan: 0 = entré, 1 = en trappa upp, -1 = källarplan. */
  floor: number;
  /** Antal lägenheter på just den våningen. 0 = hoppa över våningen. */
  count: number;
}

export interface NumberingInput {
  /** Våningarna i fysisk ordning, understa först. */
  floors: FloorSpec[];
  /** Första föreningsnumret, t.ex. "23". Inledande nollor och bredd behålls. */
  start: string | null | undefined;
  /** True = översta våningen får de lägsta föreningsnumren. */
  topDown: boolean;
}

export interface GeneratedApartment {
  /** Våning relativt entréplan. */
  floor: number;
  /** Föreningens eget nummer, t.ex. "23". */
  number: string;
  /** Lantmäteriets nummer, t.ex. "1101". Tom sträng om våningen ligger utanför skalan. */
  standardNumber: string;
  /** Så som numret visas: "23/1101". */
  label: string;
}

/** Startnummer att räkna från när fältet är tomt eller saknas. */
export const DEFAULT_NUMBER_START = "1";

function cleanStart(start: string | null | undefined): string {
  const digits = (start ?? "").replace(/\D/g, "");
  return digits.length > 0 ? digits : DEFAULT_NUMBER_START;
}

function widthOf(start: string | null | undefined): number {
  return cleanStart(start).length;
}

export function parseStart(start: string | null | undefined): number {
  const n = Number.parseInt(cleanStart(start), 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

/**
 * Våning relativt entrén → Lantmäteriets tvåsiffriga kod.
 * 0 → "10", 1 → "11", -1 → "09". Utanför 00–99 finns ingen giltig kod.
 */
export function floorCode(floor: number): string {
  const code = ENTRANCE_CODE + floor;
  if (!Number.isInteger(code) || code < 0 || code > 99) return "";
  return String(code).padStart(2, "0");
}

/** Läsbar våningsetikett: "Entréplan", "1 tr", "Källarplan 1". */
export function floorLabel(floor: number): string {
  if (floor === 0) return "Entréplan";
  if (floor > 0) return `${floor} tr`;
  return `Källarplan ${Math.abs(floor)}`;
}

/** Visningsformatet. Utan standardnummer visas bara föreningens nummer. */
export function formatApartmentNumber(
  number: string,
  standardNumber: string | null | undefined,
): string {
  return standardNumber ? `${number}/${standardNumber}` : number;
}

/**
 * Genererar båda numren. Returneras i den ordning föreningsnumren delas ut, så
 * att riktningen syns direkt i förhandsvisningen.
 */
export function buildApartmentNumbers(
  input: NumberingInput,
): GeneratedApartment[] {
  const width = widthOf(input.start);
  let next = parseStart(input.start);

  const floors = input.floors ?? [];
  const ordered = input.topDown ? [...floors].reverse() : floors;

  const out: GeneratedApartment[] = [];
  for (const { floor, count } of ordered) {
    const code = floorCode(floor);
    for (let i = 1; i <= count; i++) {
      const number = String(next).padStart(width, "0");
      // Sista två siffrorna är lägenhetens ordning på våningen, inte det
      // löpande föreningsnumret.
      const standardNumber = code
        ? `${code}${String(i).padStart(2, "0")}`
        : "";
      out.push({
        floor,
        number,
        standardNumber,
        label: formatApartmentNumber(number, standardNumber),
      });
      next++;
    }
  }
  return out;
}

/** Våningsintervall → rader att fylla i, med ett gemensamt startantal. */
export function floorRange(
  from: number,
  to: number,
  defaultCount: number,
): FloorSpec[] {
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
  // Rimlig gräns så att ett tappat minustecken inte genererar hundratals rader.
  if (to - from > 60) return [];
  const out: FloorSpec[] = [];
  for (let f = from; f <= to; f++) out.push({ floor: f, count: defaultCount });
  return out;
}

/**
 * Sorterar lägenhetsnummer så som en människa läser dem: 1, 2, 10, 11 – inte
 * 1, 10, 11, 2. Numret lagras som text (det kan vara "12B" eller ha inledande
 * nollor), så databasens teckenvisa ORDER BY ger fel ordning.
 *
 * Intl.Collator med numeric:true jämför siffergrupper som tal och resten som
 * text, vilket klarar både "10" > "9" och "12A" < "12B".
 */
const numberCollator = new Intl.Collator("sv", {
  numeric: true,
  sensitivity: "base",
});

export function compareApartmentNumbers(a: string, b: string): number {
  return numberCollator.compare(a, b);
}
