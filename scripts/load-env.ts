import { readFileSync } from "node:fs";

/**
 * Läser .env.local och sedan .env in i process.env, utan att skriva över det
 * som redan är satt. Skripten körs med tsx utanför Next, som annars sköter det.
 */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        let v = m[2].trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        )
          v = v.slice(1, -1);
        if (!(m[1] in process.env)) process.env[m[1]] = v;
      }
    } catch {
      // filen behöver inte finnas
    }
  }
}
