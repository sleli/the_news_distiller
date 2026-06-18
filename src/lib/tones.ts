export const VALID_TONES = ["neutro", "analitico", "divulgativo", "critico"] as const;

export type ToneKey = (typeof VALID_TONES)[number];

export function isValidTone(value: unknown): value is ToneKey {
  return typeof value === "string" && (VALID_TONES as readonly string[]).includes(value);
}
