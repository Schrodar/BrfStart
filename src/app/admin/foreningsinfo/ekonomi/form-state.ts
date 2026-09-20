import type { FormState } from "@/lib/form";

/**
 * Egen fil i stället för i actions.ts: en "use server"-fil får bara exportera
 * asynkrona funktioner.
 */
export interface EconomyFormState extends FormState {
  /**
   * Formulärets ögonblicksbild när det senast sparades. Klienten jämför med
   * nuläget för att veta om det finns osparade ändringar.
   */
  savedKey?: string;
}
