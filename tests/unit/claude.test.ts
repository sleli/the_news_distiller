const mockCreate = jest.fn();
const mockAnthropicConstructor = jest.fn(() => ({
  messages: { create: mockCreate },
}));

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: mockAnthropicConstructor,
}));

import { TONE_INSTRUCTIONS } from "@/lib/tones";

describe("src/lib/claude.ts", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ANTHROPIC_API_KEY: "test-key" };
    mockCreate.mockReset();
    mockAnthropicConstructor.mockClear();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("happy path — restituisce DistillResult valido da un tool_use block", async () => {
    const expectedResult = {
      summary: "Sintesi di test",
      positions: [
        {
          label: "Posizione A",
          headline: "Titolo posizione",
          body: "Corpo posizione",
          sourceRefs: ["1"],
        },
      ],
      sources: [{ title: "Fonte 1", url: "https://example.com/1" }],
    };

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "tool_01",
          name: "extract_distillation",
          input: expectedResult,
        },
      ],
    });

    const { distillArticles } = await import("@/lib/claude");
    const result = await distillArticles(
      [{ title: "Articolo 1", url: "https://example.com/1", content: "Contenuto 1" }],
      "riforma pensioni",
      "neutro"
    );

    expect(result).toEqual(expectedResult);
  });

  it("parametrizzazione tono — il system prompt contiene l'istruzione del tono richiesto", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "tool_use",
          id: "tool_02",
          name: "extract_distillation",
          input: {
            summary: "S",
            positions: [{ label: "l", headline: "h", body: "b", sourceRefs: ["r"] }],
            sources: [{ title: "T", url: "https://ex.com" }],
          },
        },
      ],
    });

    const { distillArticles } = await import("@/lib/claude");
    await distillArticles(
      [{ title: "Art", url: "https://ex.com", content: "Testo" }],
      "test topic",
      "analitico"
    );

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain(TONE_INSTRUCTIONS["analitico"]);
  });

  it("chiave mancante — lancia un errore all'import se ANTHROPIC_API_KEY non è configurata", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(import("@/lib/claude")).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("tool use assente — lancia un errore se la risposta non contiene un tool_use block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Risposta in testo libero" }],
    });

    const { distillArticles } = await import("@/lib/claude");
    await expect(
      distillArticles(
        [{ title: "Art", url: "https://ex.com", content: "Testo" }],
        "topic",
        "critico"
      )
    ).rejects.toThrow("tool_use");
  });

  describe("validateDistillResult", () => {
    const VALID_PAYLOAD = {
      summary: "Sintesi valida",
      positions: [
        {
          label: "pos-a",
          headline: "Titolo A",
          body: "Corpo A",
          sourceRefs: ["ref-1"],
        },
      ],
      sources: [{ title: "Fonte 1", url: "https://example.com/1" }],
    };

    it("payload valido completo — ritorna DistillResult senza errori", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      expect(validateDistillResult(VALID_PAYLOAD)).toEqual(VALID_PAYLOAD);
    });

    it("summary mancante — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      const payload = { ...VALID_PAYLOAD, summary: undefined };
      expect(() => validateDistillResult(payload)).toThrow();
    });

    it("posizione con sourceRefs vuoto — lancia Error con frammento JSON nel messaggio", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      const payload = {
        ...VALID_PAYLOAD,
        positions: [{ ...VALID_PAYLOAD.positions[0], sourceRefs: [] }],
      };
      expect(() => validateDistillResult(payload)).toThrow(/sourceRefs/);
    });

    it("fonte con url mancante — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      const payload = {
        ...VALID_PAYLOAD,
        sources: [{ title: "Fonte senza URL", url: "" }],
      };
      expect(() => validateDistillResult(payload)).toThrow();
    });

    it("input null — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      expect(() => validateDistillResult(null)).toThrow();
    });

    it("input stringa — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      expect(() => validateDistillResult("stringa non valida")).toThrow();
    });

    it("distillArticles con payload tool_use invalido — lancia errore di validazione", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tool_invalid",
            name: "extract_distillation",
            input: { summary: "", positions: [], sources: [] },
          },
        ],
      });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(
          [{ title: "Art", url: "https://ex.com", content: "Testo" }],
          "topic",
          "neutro"
        )
      ).rejects.toThrow(/Payload Claude non valido/);
    });
  });
});
