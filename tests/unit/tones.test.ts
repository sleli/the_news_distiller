import { TONE_INSTRUCTIONS, VALID_TONES, isValidTone } from "@/lib/tones";

describe("src/lib/tones.ts", () => {
  it("TONE_INSTRUCTIONS contiene le 4 chiavi attese", () => {
    const keys = Object.keys(TONE_INSTRUCTIONS);
    expect(keys).toHaveLength(4);
    expect(keys).toEqual(expect.arrayContaining(["neutro", "analitico", "divulgativo", "critico"]));
  });

  it("ogni valore di TONE_INSTRUCTIONS è una stringa non vuota", () => {
    for (const tone of VALID_TONES) {
      const instruction = TONE_INSTRUCTIONS[tone];
      expect(typeof instruction).toBe("string");
      expect(instruction.trim().length).toBeGreaterThan(0);
    }
  });

  it("isValidTone ritorna false per valori non nel set", () => {
    expect(isValidTone("sconosciuto")).toBe(false);
    expect(isValidTone("")).toBe(false);
    expect(isValidTone(42)).toBe(false);
    expect(isValidTone(null)).toBe(false);
    expect(isValidTone(undefined)).toBe(false);
  });
});
