import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AssociationProfile, DocumentCategory } from "@/lib/types";

/** Slår ihop klassnamn och löser Tailwind-konflikter. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Kortnamnet för header, meny och sidtitlar – tomt faller tillbaka på namnet. */
export function shortNameOf(
  profile: Pick<AssociationProfile, "name" | "shortName">,
): string {
  return profile.shortName || profile.name;
}

/**
 * Adressen ur ?next=, om den går att lita på. Bara interna sökvägar släpps
 * igenom: "//example.com" och "/\evil" är webbläsarens sätt att skriva en
 * extern adress, och en öppen vidarebefordran hör inte hemma i en inloggning.
 */
export function safeNextPath(next: string | undefined | null): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}

/** "A", "A och B", "A, B och C" – för uppräkningar i löpande text. */
export function listText(items: string[]): string {
  const parts = items.filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} och ${parts[parts.length - 1]}`;
}

/** Förvaltarrutorna visas när något av förvaltarens fält är ifyllt. */
export function hasPropertyManager(profile: AssociationProfile): boolean {
  return Boolean(
    profile.propertyManagerName ||
      profile.propertyManagerPhone ||
      profile.propertyManagerEmail,
  );
}

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** "12 mars 2026" */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return dateFormatter.format(new Date(iso));
}

/** "12 mars 2026 14:30" */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

const sizeFormatter = new Intl.NumberFormat("sv-SE", {
  maximumFractionDigits: 1,
});

/** Filstorlek i läsbar form: "240 kB", "1,2 MB". */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "–";
  if (bytes < 1000) return `${bytes} B`;
  const units = ["kB", "MB", "GB"];
  let value = bytes / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit++;
  }
  // Under 10 i enheten är decimalen meningsfull ("1,2 MB"), över den brus.
  const rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return `${sizeFormatter.format(rounded)} ${units[unit]}`;
}

/**
 * Förslag på dokumenttitel utifrån filnamnet: "arsredovisning-2025.pdf"
 * → "Arsredovisning 2025". Alltid redigerbar av den som laddar upp.
 */
export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const words = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Gissar dokumentkategori ur filnamnet. Medvetet trubbig – den sparar ett klick
 * i normalfallet och skrivs över utan vidare när den har fel.
 */
export function guessDocumentCategory(fileName: string): DocumentCategory {
  const n = fileName.toLowerCase();
  if (n.includes("stadg")) return "stadgar";
  if (n.includes("arsredov") || n.includes("årsredov")) return "arsredovisning";
  if (n.includes("protokoll")) return "protokoll";
  if (n.includes("ordningsregl") || n.includes("trivselregl")) {
    return "ordningsregler";
  }
  return "ovrigt";
}

/** Skapar en URL-vänlig slug av en titel (svenska tecken hanteras). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Enkel unik id-generator för mock-lagret. */
export function makeId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Datum → "YYYY-MM-DD" i lokal tid (undviker UTC-glidning). */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Dagens datum som "YYYY-MM-DD". */
export function todayStr(): string {
  return toDateStr(new Date());
}

const weekdayFormatter = new Intl.DateTimeFormat("sv-SE", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Kommande N dagar från idag, med etikett (t.ex. "mån 28 jul"). */
export function upcomingDates(
  count: number,
): { date: string; label: string }[] {
  const today = new Date();
  const list: { date: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + i,
    );
    list.push({ date: toDateStr(d), label: weekdayFormatter.format(d) });
  }
  return list;
}

/** "mån 28 jul" för ett datum i formatet "YYYY-MM-DD". */
export function dateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return weekdayFormatter.format(new Date(y, m - 1, d));
}

/**
 * Minimal och säker markdown → HTML för brödtext (nyheter, sidinnehåll).
 * Stödjer ## rubriker, - listor, tomrad = nytt stycke. Escapar all HTML först
 * så inget användarinmatat kan injicera taggar.
 */
export function renderBasicMarkdown(input: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const html: string[] = [];

  /**
   * En rubrik gäller bara sin egen rad. Raderna under hör inte till rubriken
   * utan renderas som ett eget block – annars hamnar hela stycket i <h2> för
   * den som skriver rubrik och text utan tomrad emellan.
   */
  function render(block: string): void {
    const trimmed = block.trim();
    if (!trimmed) return;

    const level = trimmed.startsWith("### ")
      ? 3
      : trimmed.startsWith("## ")
        ? 2
        : 0;
    if (level > 0) {
      const newline = trimmed.indexOf("\n");
      const heading = (newline === -1 ? trimmed : trimmed.slice(0, newline))
        .slice(level + 1)
        .trim();
      html.push(`<h${level}>${escape(heading)}</h${level}>`);
      if (newline !== -1) render(trimmed.slice(newline + 1));
      return;
    }

    const lines = trimmed.split("\n");
    if (lines.every((l) => l.trim().startsWith("- "))) {
      const items = lines
        .map((l) => `<li>${escape(l.trim().slice(2))}</li>`)
        .join("");
      html.push(`<ul>${items}</ul>`);
      return;
    }

    html.push(`<p>${escape(trimmed).replace(/\n/g, "<br />")}</p>`);
  }

  for (const block of input.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    render(block);
  }

  return html.join("\n");
}
