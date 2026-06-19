export const VALID_TONES = ["neutro", "analitico", "divulgativo", "critico"] as const;

export type ToneKey = (typeof VALID_TONES)[number];

export function isValidTone(value: unknown): value is ToneKey {
  return typeof value === "string" && (VALID_TONES as readonly string[]).includes(value);
}

export const TONE_INSTRUCTIONS: Record<ToneKey, string> = {
  neutro:
    "Presenta le informazioni in modo obiettivo e imparziale, senza esprimere giudizi. Usa un linguaggio neutro e descrittivo.",
  analitico:
    "Analizza le informazioni in profondità, identificando cause, effetti e relazioni. Usa un approccio logico e strutturato con dati e argomentazioni concrete.",
  divulgativo:
    "Spiega i concetti in modo chiaro e accessibile per un pubblico non specializzato. Usa esempi pratici e un linguaggio semplice, evitando tecnicismi.",
  critico:
    "Valuta criticamente le informazioni, evidenziando punti di forza, debolezze e implicazioni. Esprimi un giudizio fondato sull'evidenza disponibile.",
};
