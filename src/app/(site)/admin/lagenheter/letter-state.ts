import type { AccessLetter } from "@/lib/data/access-codes";

/**
 * Svaret från actions som skapar koder. Breven – med koderna i klartext – finns
 * bara här, i det svaret. Ligger i en egen fil eftersom en "use server"-fil
 * bara får exportera funktioner.
 */
export interface LetterState {
  letters?: AccessLetter[];
  /** Sajtens adress, för länkarna i brevet. */
  origin?: string;
  error?: string;
}
