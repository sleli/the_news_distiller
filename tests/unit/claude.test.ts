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
          input: { summary: "S", positions: [], sources: [] },
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
});
