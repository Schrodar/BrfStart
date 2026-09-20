/** Gemensamt returtillstånd för formulär-actions i adminpanelen. */
export interface FormState {
  error?: string;
  success?: string;
}

/**
 * Namnet på det osynliga honeypot-fältet i publika formulär. Människor ser det
 * inte och lämnar det tomt; bottar fyller i det. Ligger här och inte i
 * actions-filen, eftersom en "use server"-fil bara får exportera funktioner.
 */
export const HONEYPOT_FIELD = "website";
